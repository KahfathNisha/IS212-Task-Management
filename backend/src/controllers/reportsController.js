const { db, admin } = require('../config/firebase'); // Ensure admin is imported for serverTimestamp

/**
 * Helper function to get user data and check permissions.
 * This is crucial for RBAC.
 * Uses req.user from verifyToken middleware instead of fetching user again.
 */
async function getUserPermissions(requesterId, reqUser = null) {
  // If req.user is available from middleware, use it (preferred approach)
  if (reqUser && reqUser.email) {
    const role = reqUser.role?.toLowerCase() || 'staff';
    const department = reqUser.department || null;
    
    return {
      user: reqUser,
      role: role,
      department: department,
      canViewProject: ['staff', 'manager', 'director'].includes(role),
      canViewIndividual: ['staff', 'manager', 'director', 'hr'].includes(role),
      canViewDepartment: ['manager', 'director', 'hr'].includes(role),
      canViewCompany: role === 'director' || role === 'hr', // HR can view company reports for KPI tracking
    };
  }
  
  // Fallback: fetch user if req.user is not available (for backward compatibility)
  if (!requesterId) {
    throw new Error('Unauthorized: Requester ID is required.');
  }
  // Use 'Users' collection name
  const userDoc = await db.collection('Users').doc(requesterId).get();
  if (!userDoc.exists) {
    throw new Error('Forbidden: Requester profile not found.');
  }
  const userData = userDoc.data();
  const role = userData.role?.toLowerCase() || 'staff';
  
  // Your RBAC Matrix Logic - Updated to include HR for company reports
  return {
    user: userData,
    role: role,
    department: userData.department || null,
    canViewProject: ['staff', 'manager', 'director'].includes(role),
    canViewIndividual: ['staff', 'manager', 'director', 'hr'].includes(role),
    canViewDepartment: ['manager', 'director', 'hr'].includes(role),
    canViewCompany: role === 'director' || role === 'hr', // HR can view company reports for KPI tracking
  };
}

/**
 * Helper function to capitalize first letter of department names
 * Special handling for acronyms that should be fully capitalized (e.g., "IT")
 */
const capitalizeFirstLetter = (str) => {
  if (!str || typeof str !== 'string') return str;
  if (str.length === 0) return str;
  
  // Handle special acronyms that should be fully capitalized
  const upperStr = str.toUpperCase();
  const acronyms = ['IT', 'HR', 'API', 'UI', 'UX', 'QA', 'R&D', 'CRM', 'ERP'];
  if (acronyms.includes(upperStr)) {
    return upperStr;
  }
  
  // For other strings, capitalize first letter only
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Helper function to normalize task status
 */
const normalizeStatus = (s) => {
  const val = (s || '').toString().toLowerCase();
  if (['ongoing', 'in progress', 'progress'].includes(val)) return 'Ongoing';
  if (['pending review', 'pending'].includes(val)) return 'Pending Review';
  if (['completed', 'complete', 'done'].includes(val)) return 'Completed';
  return 'To Do'; // Default for 'unassigned', 'to do', etc.
};

/**
 * Helper function to check if task is overdue
 */
const isOverdue = (task) => {
  const status = normalizeStatus(task.status);
  if (status === 'Completed' || !task.dueDate) return false;
  // Ensure dueDate is a Firebase Timestamp
  if (typeof task.dueDate.toDate !== 'function') return false; 
  const dueDate = task.dueDate.toDate();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Compare dates only
  return dueDate < today;
};

/**
 * RBAC check for report generation permissions
 */
const checkReportPermission = (userRole, reportType) => {
  const permissions = {
    'staff': {
      'individual': false, // Staff can view their own individual report (handled separately in controller logic)
      'project': true,
      'department': false,
      'company': false
    },
    'manager': {
      'individual': true,
      'project': true,
      'department': true,
      'company': false
    },
    'director': {
      'individual': true,
      'project': true,
      'department': true,
      'company': true
    },
    'hr': {
      'individual': true, // Can view individual reports of all employees (for KPI tracking)
      'project': false,
      'department': true,
      'company': true // Can view company-wide metrics for KPI tracking
    }
  };
  
  const rolePerms = permissions[userRole?.toLowerCase()];
  return rolePerms && rolePerms[reportType] === true;
};

/**
 * Generates a progress report for a specific project (for Staff/Managers/Directors).
 */
exports.generateProjectReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { requesterId } = req.query;
    
    // Handle missing requesterId gracefully
    if (!requesterId && !req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Requester ID is required.' });
    }
    
    const perms = await getUserPermissions(requesterId, req.user);

    if (!perms.canViewProject) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission for this report type.' });
    }

    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) return res.status(404).json({ success: false, message: 'Project not found.' });
    
    const projectData = projectDoc.data();

    // Security: Staff/Managers can only view projects they are members of.
    if (perms.role === 'staff' || perms.role === 'manager') {
      if (!projectData.members || !projectData.members.includes(requesterId)) {
        return res.status(403).json({ success: false, message: 'Forbidden: You are not a member of this project.' });
      }
    }

    // Query tasks by projectId first (single field index, no composite needed)
    // Then sort in memory to avoid composite index requirement
    const tasksSnapshot = await db.collection('tasks').where('projectId', '==', projectId).get();
    let tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sort by due date in memory to avoid composite index requirement
    tasks.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1; // Tasks without due date go to end
      if (!b.dueDate) return -1;
      const dateA = a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
      const dateB = b.dueDate.toDate ? b.dueDate.toDate() : new Date(b.dueDate);
      return dateA - dateB;
    });

    const totalTasks = tasks.length;
    const statusCounts = { 'To Do': 0, 'Ongoing': 0, 'Pending Review': 0, 'Completed': 0 };
    const memberWorkload = {};
    let overdueCount = 0;
    const now = new Date();

    const richerTasks = tasks.map(task => {
      const status = normalizeStatus(task.status);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      if (task.assignedTo) { // Your single-assignee logic
        memberWorkload[task.assignedTo] = (memberWorkload[task.assignedTo] || 0) + 1;
      }
      
      const overdue = isOverdue(task);
      if (overdue) overdueCount++;

      // Check "At Risk" (due in 3 days, not complete)
      let atRisk = false;
      if (!overdue && status !== 'Completed' && task.dueDate?.toDate) {
        const due = task.dueDate.toDate();
        const daysUntilDue = (due - now) / (1000 * 60 * 60 * 24);
        if (daysUntilDue <= 3 && daysUntilDue >= 0) { // Only if due in future
          atRisk = true;
        }
      }

      return {
        id: task.id,
        title: task.title,
        status: status,
        assignedTo: task.assignedTo || null,
        dueDate: task.dueDate || null,
        isOverdue: overdue,
        isAtRisk: atRisk,
      };
    });
    
    // Resolve assignee names for workload chart
    const memberEmails = Object.keys(memberWorkload);
    let memberNames = {};
    if(memberEmails.length > 0) {
      const userRefs = memberEmails.map(email => db.collection('Users').doc(email));
      const userDocs = await db.getAll(...userRefs);
      userDocs.forEach(doc => {
        if (doc.exists) {
          memberNames[doc.id] = doc.data().name || doc.id.split('@')[0];
        } else {
          memberNames[doc.id] = doc.id.split('@')[0];
        }
      });
    }

    const report = {
      title: projectData.name,
      type: 'project',
      generatedAt: new Date().toISOString(),
      summary: { 
        totalTasks, 
        statusCounts, 
        memberWorkload, // The backend sends this
        memberNames, // And sends the names
        overdueCount, 
        overduePercentage: (totalTasks > 0) ? ((overdueCount / totalTasks) * 100).toFixed(0) : 0 
      },
      tasks: richerTasks,
    };
    res.status(200).json({ success: true, report });

  } catch (error) {
    console.error('Error generating project report:', error.message, error.stack);
    res.status(500).json({ success: false, message: "Error generating project report: " + error.message });
  }
};

/**
 * 2. INDIVIDUAL PERFORMANCE REPORT (Staff, Manager, HR, Director)
 * User Story: "Individual Progress Report"
 */
exports.generateIndividualReport = async (req, res) => {
  try {
  // Safely read query params (use empty object if req.query is missing)
  const { employeeEmail, departments, department, startDate, endDate } = req?.query || {};
    const { requesterId } = req.query;
    const perms = await getUserPermissions(requesterId, req.user);

    if (!perms.canViewIndividual) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission for this report type.' });
    }

    const employeeDoc = await db.collection('Users').doc(employeeEmail).get();
    if (!employeeDoc.exists) return res.status(404).json({ success: false, message: "Employee not found." });
    const employeeData = employeeDoc.data();

    // Security: Check if requester is allowed to view this specific employee
    if (perms.role === 'staff' && requesterId !== employeeEmail) {
      return res.status(403).json({ success: false, message: "Forbidden: Staff can only view their own reports." });
    }
    // HR can view all employees (for KPI tracking across company)
    // Managers can only view employees in their department
    if (perms.role === 'manager' && employeeData.department !== perms.department) {
      return res.status(403).json({ success: false, message: "Forbidden: Managers can only view reports for employees in their department." });
    }

    // Query tasks by assignedTo - this is the primary filter for individual reports
    // Individual reports should ALWAYS be filtered by the employee's assigned tasks
    let tasksQuery = db.collection('tasks').where('assignedTo', '==', employeeEmail);
    let tasksSnapshot = await tasksQuery.get();
    let tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Apply department filtering in memory (after getting assigned tasks)
    // This ensures we only show tasks assigned to the employee that match the department filter
    if (departments && departments !== 'ALL') {
      // Multiple departments selected (comma-separated)
      const deptArray = departments.split(',').map(d => d.trim()).filter(d => d && d !== 'ALL');
      if (deptArray.length > 0) {
        tasks = tasks.filter(task => deptArray.includes(task.taskOwnerDepartment));
      }
    } else if (department && department !== 'ALL') {
      // Single department (backward compatibility)
      tasks = tasks.filter(task => task.taskOwnerDepartment === department);
    }
    // If 'ALL' or no filter, keep all assigned tasks (no additional filtering)
    
    // Filter by date range in memory to avoid composite index requirement
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      tasks = tasks.filter(task => {
        if (!task.createdAt) return false;
        const createdDate = task.createdAt.toDate ? task.createdAt.toDate() : new Date(task.createdAt);
        if (start && createdDate < start) return false;
        if (end) {
          // Include end date (end of day)
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          if (createdDate > endOfDay) return false;
        }
        return true;
      });
    }

    const totalTasks = tasks.length;
    let completedTasks = 0;
    let overdueTasks = 0;
    const statusCounts = { 'To Do': 0, 'Ongoing': 0, 'Pending Review': 0, 'Completed': 0 };
    let totalTimeDays = 0;
    const timeBreakdown = [];

    tasks.forEach(task => {
      const status = normalizeStatus(task.status);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      if (status === 'Completed') completedTasks++;
      if (isOverdue(task)) overdueTasks++;
      
      if (status === 'Completed' && task.createdAt?.toDate && task.updatedAt?.toDate) {
        const created = task.createdAt.toDate();
        const updated = task.updatedAt.toDate();
        const daysTaken = Math.max(1, Math.ceil((updated - created) / (1000 * 60 * 60 * 24))); // Min 1 day
        totalTimeDays += daysTaken;
        timeBreakdown.push({
          id: task.id,
          title: task.title,
          daysTaken: daysTaken
        });
      }
    });
    
    timeBreakdown.sort((a, b) => b.daysTaken - a.daysTaken);

    const report = {
      title: `Individual Report: ${employeeData.name || employeeEmail}`,
      type: 'individual',
      generatedAt: new Date().toISOString(),
      employee: {
        email: employeeEmail,
        name: employeeData.name || employeeEmail.split('@')[0],
        department: employeeData.department || 'Unassigned',
        role: employeeData.role || 'staff',
        ...employeeData
      },
      summary: {
        totalTasks,
        completedTasks,
        overdueTasks,
        completionRate: (totalTasks > 0) ? ((completedTasks / totalTasks) * 100).toFixed(0) : 0,
        avgTimePerTask: (completedTasks > 0) ? (totalTimeDays / completedTasks).toFixed(1) : 0,
        statusCounts,
      },
      timeBreakdown: timeBreakdown.slice(0, 10),
    };
    res.status(200).json({ success: true, report });

  } catch (error) {
    console.error('Error generating individual report:', error.message, error.stack);
    res.status(500).json({ success: false, message: "Error generating individual report: " + error.message });
  }
};

/**
 * 3. DEPARTMENT WORKLOAD REPORT (Manager, HR, Director)
 * User Story: "Workload Distribution Report for HR Management"
 */
exports.generateDepartmentReport = async (req, res) => {
  try {
    const { department } = req.query;
    const { requesterId } = req.query;
    const perms = await getUserPermissions(requesterId, req.user);

    if (!perms.canViewDepartment) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission for this report type.' });
    }

    // HR and Directors can view all departments (same access rights), Managers can only view their own
    if (perms.role === 'manager' && department !== 'ALL' && perms.department !== department) {
      return res.status(403).json({ success: false, message: "Forbidden: Managers can only view reports for their own department." });
    }

    const usersQuery = await db.collection('Users').where('department', '==', department).get();
    // Build departmentUsers from snapshot; don't assume HR users have no tasks.
    // Use doc.id as a safe fallback for email if the email field is missing.
    const departmentUsers = usersQuery.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        email: data.email || doc.id,
        name: data.name || doc.id.split('@')[0],
        role: data.role || 'staff',
        department: data.department || department,
        ...data
      };
    });
    const userEmails = departmentUsers.map(user => user.email);

    if (userEmails.length === 0) {
      return res.status(200).json({ success: true, report: { title: `${capitalizeFirstLetter(department)} Report`, type: 'department', generatedAt: new Date().toISOString(), totalTasks: 0, employeeWorkloads: {} } });
    }
    
    // Query tasks assigned to employees in this department
    // Since Firestore 'in' queries are limited to 10 items, we need to batch or fetch all and filter
    // For now, fetch all tasks and filter by assignedTo email
    // This ensures we get all tasks assigned to department employees, even if taskOwnerDepartment isn't set
    const allTasksSnapshot = await db.collection('tasks').get();
    const userEmailSet = new Set(userEmails);
    const allTasks = allTasksSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
    
    // Filter tasks: either assigned to department employees OR have matching taskOwnerDepartment
    // Use case-insensitive comparison for department matching
    const tasks = allTasks.filter(task => {
      const assignedToEmployee = task.assignedTo && userEmailSet.has(task.assignedTo);
      // Case-insensitive department comparison
      const taskDept = task.taskOwnerDepartment ? task.taskOwnerDepartment.toUpperCase() : '';
      const deptUpper = department ? department.toUpperCase() : '';
      const hasMatchingDepartment = taskDept === deptUpper && taskDept !== '' && taskDept !== 'ALL';
      return assignedToEmployee || hasMatchingDepartment;
    });

    const employeeWorkloads = {};
    // Filter out HR users from department workload reports (HR is admin/support, not operational staff)
    const operationalUsers = departmentUsers.filter(user => {
      const userRole = (user.role || 'staff').toLowerCase();
      return userRole !== 'hr';
    });
    
    operationalUsers.forEach(user => {
      employeeWorkloads[user.email] = {
        name: user.name,
        'To Do': 0, 'Ongoing': 0, 'Pending Review': 0, 'Completed': 0, 'Total': 0, 'Overdue': 0,
        tasks: []
      };
    });
    
    // Add entry for unassigned tasks in this department
    employeeWorkloads['__UNASSIGNED__'] = {
      name: 'Unassigned',
      'To Do': 0, 'Ongoing': 0, 'Pending Review': 0, 'Completed': 0, 'Total': 0, 'Overdue': 0,
      tasks: []
    };

    const projectIds = [...new Set(tasks.map(t => t.projectId).filter(Boolean))];
    const projectRefs = projectIds.map(id => db.collection('projects').doc(id));
    const projectDocs = projectRefs.length > 0 ? await db.getAll(...projectRefs) : [];
    const projectMap = projectDocs.reduce((acc, doc) => {
      if (doc.exists) acc[doc.id] = doc.data().name;
      return acc;
    }, {});

    // Create a set of operational user emails (excluding HR) for quick lookup
    const operationalUserEmails = new Set(operationalUsers.map(u => u.email));
    
    tasks.forEach(task => {
      const assignee = task.assignedTo;
      const status = normalizeStatus(task.status);
      
      // Skip tasks assigned to HR users (they're not operational staff)
      if (assignee) {
        const assigneeUser = departmentUsers.find(u => u.email === assignee);
        if (assigneeUser && (assigneeUser.role || 'staff').toLowerCase() === 'hr') {
          return; // Skip HR user tasks
        }
      }
      
      // Determine if task belongs to an employee in this department or is unassigned
      let targetAssignee = assignee;
      if (!assignee || !employeeWorkloads[assignee]) {
        // Task is unassigned OR assigned to someone not in this department
        // If taskOwnerDepartment matches this department (case-insensitive), count it as unassigned in this dept
        const taskDept = task.taskOwnerDepartment ? task.taskOwnerDepartment.toUpperCase() : '';
        const deptUpper = department ? department.toUpperCase() : '';
        if (taskDept === deptUpper && taskDept !== '' && taskDept !== 'ALL') {
          targetAssignee = '__UNASSIGNED__';
        } else {
          // Task doesn't belong to this department - skip it
          return;
        }
      }
      
      // Double-check: only count tasks for operational users
      if (targetAssignee !== '__UNASSIGNED__' && !operationalUserEmails.has(targetAssignee)) {
        return; // Skip if assignee is not in operational users (e.g., HR)
      }
      
      if (employeeWorkloads[targetAssignee]) {
        employeeWorkloads[targetAssignee][status]++;
        employeeWorkloads[targetAssignee]['Total']++;
        if (isOverdue(task)) {
          employeeWorkloads[targetAssignee]['Overdue']++;
        }
        employeeWorkloads[targetAssignee].tasks.push({
          id: task.id,
          title: task.title,
          status: status,
          priority: task.priority,
          dueDate: task.dueDate || null,
          projectName: projectMap[task.projectId] || 'N/A'
        });
      }
    });
    
    // Remove unassigned entry if it has no tasks (cleaner output)
    if (employeeWorkloads['__UNASSIGNED__'] && employeeWorkloads['__UNASSIGNED__'].Total === 0) {
      delete employeeWorkloads['__UNASSIGNED__'];
    }

    const report = {
      title: `${capitalizeFirstLetter(department)} Department Report`,
      type: 'department',
      generatedAt: new Date().toISOString(),
      employeeWorkloads,
      totalTasks: tasks.length,
    };
    res.status(200).json({ success: true, report });

  } catch (error) {
    console.error('Error generating department report:', error.message, error.stack);
    res.status(500).json({ success: false, message: "Error generating department report: " + error.message });
  }
};

/**
 * 4. COMPANY PERFORMANCE REPORT (Director)
 * User Story: "Report Generation for Board Review for Director"
 */
exports.generateCompanyReport = async (req, res) => {
   try {
    const { startDate, endDate, department } = req.query;
    const { requesterId } = req.query;
    const perms = await getUserPermissions(requesterId, req.user);

    if (!perms.canViewCompany) {
      return res.status(403).json({ success: false, message: "Forbidden: Only Directors and HR can generate company-wide reports." });
    }

    // Helper function to check if a department is HR-related (should be filtered out)
    const isHRDepartment = (dept) => {
      if (!dept || typeof dept !== 'string') return false;
      const deptUpper = dept.toUpperCase().trim();
      // Match common HR department names: "HR", "HR and Admin", "Human Resources", etc.
      return deptUpper === 'HR' || 
             deptUpper === 'H R' ||
             deptUpper.startsWith('HR ') || 
             deptUpper.includes(' HR ') ||
             deptUpper.endsWith(' HR') ||
             deptUpper === 'HUMAN RESOURCES' ||
             deptUpper === 'HR AND ADMIN' ||
             deptUpper === 'HR & ADMIN' ||
             deptUpper === 'HRADMIN';
    };

    // Handle multiple department filtering
    const { departments } = req.query;
    
    // Get all users to map emails to departments (for tasks that don't have taskOwnerDepartment set)
    const allUsersSnapshot = await db.collection('Users').get();
    const userDepartmentMap = {}; // email -> department
    allUsersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      const email = userData.email || doc.id;
      const dept = userData.department;
      if (dept && dept.toUpperCase() !== 'ALL') {
        userDepartmentMap[email] = dept;
      }
    });
    
    // Determine which departments to include
    // If "ALL" is selected (either as department='ALL' or departments includes 'ALL'), don't filter
    let targetDepartments = null;
    const isAllSelected = (department === 'ALL') || 
                          (departments === 'ALL') || 
                          (departments && departments.includes('ALL'));
    
    if (!isAllSelected) {
      if (departments && departments.trim() !== '') {
        // Multiple departments selected (comma-separated)
        const deptArray = departments.split(',').map(d => d.trim())
          .filter(d => d && d !== 'ALL' && d.toUpperCase() !== 'ALL')
          .filter(d => !isHRDepartment(d)); // Filter out HR departments
        if (deptArray.length > 0) {
          targetDepartments = new Set(deptArray);
        }
      } else if (department && department !== 'ALL' && department.toUpperCase() !== 'ALL') {
        // Single department selected - but don't allow HR department
        if (!isHRDepartment(department)) {
          targetDepartments = new Set([department]);
        }
      }
    }
    // If isAllSelected is true, targetDepartments remains null and no filtering occurs
    
    // Fetch all tasks (we'll filter by department in memory)
    const tasksSnapshot = await db.collection('tasks').get();
    let tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Helper function to determine a task's department (used consistently for filtering and counting)
    const getTaskDepartment = (task) => {
      // Priority: taskOwnerDepartment > assignedTo user's department > Uncategorized
      if (task.taskOwnerDepartment && task.taskOwnerDepartment.toUpperCase() !== 'ALL') {
        return task.taskOwnerDepartment;
      }
      if (task.assignedTo && userDepartmentMap[task.assignedTo]) {
        return userDepartmentMap[task.assignedTo];
      }
      return 'Uncategorized';
    };

    // Filter tasks by department ONLY if specific departments were selected (not "ALL")
    // Note: If all selected departments were HR (and filtered out), targetDepartments will be empty
    // In that case, we don't filter tasks, but HR departments will still be excluded from stats later
    if (targetDepartments && targetDepartments.size > 0) {
      // Create case-insensitive comparison map for departments
      const deptMapLower = new Map();
      targetDepartments.forEach(dept => {
        deptMapLower.set(dept.toLowerCase(), dept);
      });
      
      tasks = tasks.filter(task => {
        const taskDept = getTaskDepartment(task);
        // Exclude HR departments from filtering (they'll be excluded from stats anyway)
        if (isHRDepartment(taskDept)) {
          return false;
        }
        // Check case-insensitive match
        return deptMapLower.has(taskDept.toLowerCase());
      });
    }
    // If targetDepartments is null or empty, all tasks are included (no filtering)
    // HR departments will still be excluded from departmentStats below

    // Manual date filtering
    if (startDate) {
      const start = new Date(startDate);
      tasks = tasks.filter(t => {
        if (!t.createdAt) return false;
        const created = t.createdAt.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        return created >= start;
      });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include entire end date
      tasks = tasks.filter(t => {
        if (!t.createdAt) return false;
        const created = t.createdAt.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        return created <= end;
      });
    }
    
    const departmentStats = {};
    let totalOverdue = 0;
    const statusCounts = { 'To Do': 0, 'Ongoing': 0, 'Pending Review': 0, 'Completed': 0 };

    // Count each task exactly once, using the same department determination logic as filtering
    // Exclude HR departments from company reports (HR is admin/support, not operational)
    tasks.forEach(task => {
      const dept = getTaskDepartment(task);
      
      // Skip HR departments - they shouldn't appear in operational reports
      if (isHRDepartment(dept)) {
        return;
      }
      
      if (!departmentStats[dept]) {
        departmentStats[dept] = { name: capitalizeFirstLetter(dept), total: 0, completed: 0, overdue: 0 };
      }
      
      const status = normalizeStatus(task.status);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      departmentStats[dept].total++;

      if (status === 'Completed') {
        departmentStats[dept].completed++;
      }
      if (isOverdue(task)) {
        departmentStats[dept].overdue++;
        totalOverdue++;
      }
    });
    
    Object.values(departmentStats).forEach(stats => {
      stats.completionRate = (stats.total > 0) ? ((stats.completed / stats.total) * 100).toFixed(0) : 0;
      stats.overdueRate = (stats.total > 0) ? ((stats.overdue / stats.total) * 100).toFixed(0) : 0;
    });

    const report = {
      title: department && department !== 'ALL' ? `${capitalizeFirstLetter(department)} Department Report` : "Company-Wide Report",
      type: 'company',
      generatedAt: new Date().toISOString(),
      summary: {
        totalTasks: tasks.length,
        overdueCount: totalOverdue,
        overduePercentage: tasks.length > 0 ? parseFloat(((totalOverdue / tasks.length) * 100).toFixed(0)) : 0,
        statusCounts,
      },
      departmentStats: Object.values(departmentStats), // Send as an array for v-data-table
    };
    res.status(200).json({ success: true, report });

  } catch (error) {
    console.error('Error generating company report:', error.message, error.stack);
    res.status(500).json({ success: false, message: "Error generating company report: " + error.message });
  }
};

