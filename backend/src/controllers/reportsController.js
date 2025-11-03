const { db, admin } = require('../config/firebase'); // Ensure admin is imported for serverTimestamp

/**
 * Helper function to get user data and check permissions.
 * This is crucial for RBAC.
 */
async function getUserPermissions(requesterId) {
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
    department: userData.department,
    canViewProject: ['staff', 'manager', 'director'].includes(role),
    canViewIndividual: ['staff', 'manager', 'director', 'hr'].includes(role),
    canViewDepartment: ['manager', 'director', 'hr'].includes(role),
    canViewCompany: role === 'director' || role === 'hr', // HR can view company reports for KPI tracking
  };
}

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
    const perms = await getUserPermissions(requesterId);

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
    const { employeeEmail, departments, startDate, endDate } = req.query;
    const { requesterId } = req.query;
    const perms = await getUserPermissions(requesterId);

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

    // Query tasks by assignedTo first (single field index, no composite needed)
    let tasksQuery = db.collection('tasks').where('assignedTo', '==', employeeEmail);
    const tasksSnapshot = await tasksQuery.get();

    // Build query for tasks
    let tasksSnapshot;
    
    // Handle multiple department filtering
    if (departments && departments !== 'ALL') {
      // Multiple departments selected (comma-separated)
      const deptArray = departments.split(',').map(d => d.trim()).filter(d => d && d !== 'ALL');
      
      if (deptArray.length === 0) {
        // If no valid departments, get all tasks
        tasksSnapshot = await db.collection('tasks').get();
      } else if (deptArray.length === 1) {
        // Single department, use where query
        tasksSnapshot = await db.collection('tasks').where('taskOwnerDepartment', '==', deptArray[0]).get();
      } else {
        // Multiple departments - Firestore doesn't support OR in where, so fetch all and filter
        tasksSnapshot = await db.collection('tasks').get();
      }
    } else if (department && department !== 'ALL') {
      // Single department (backward compatibility)
      tasksSnapshot = await db.collection('tasks').where('taskOwnerDepartment', '==', department).get();
    } else {
      // ALL departments or no filter
      tasksSnapshot = await db.collection('tasks').get();
    }
    
    let tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filter by multiple departments if needed (when using departments parameter)
    if (departments && departments !== 'ALL') {
      const deptArray = departments.split(',').map(d => d.trim()).filter(d => d && d !== 'ALL');
      if (deptArray.length > 1) {
        tasks = tasks.filter(task => deptArray.includes(task.taskOwnerDepartment));
      }
    }
    
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
      title: `Individual Report: ${employeeData.name}`,
      type: 'individual',
      generatedAt: new Date().toISOString(),
      employee: employeeData,
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
    const perms = await getUserPermissions(requesterId);

    if (!perms.canViewDepartment) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission for this report type.' });
    }

    // HR can view all departments (for KPI tracking), Managers can only view their own
    if (perms.role === 'manager' && department !== 'ALL' && perms.department !== department) {
      return res.status(403).json({ success: false, message: "Forbidden: Managers can only view reports for their own department." });
    }

    const usersQuery = await db.collection('Users').where('department', '==', department).get();
    // Filter out HR users - they don't have tasks so shouldn't be included in department reports
    const departmentUsers = usersQuery.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => user.role?.toLowerCase() !== 'hr');
    const userEmails = departmentUsers.map(user => user.email);

    if (userEmails.length === 0) {
      return res.status(200).json({ success: true, report: { title: `${department} Report`, type: 'department', generatedAt: new Date().toISOString(), totalTasks: 0, employeeWorkloads: {} } });
    }
    
    const tasksQuery = await db.collection('tasks').where('taskOwnerDepartment', '==', department).get();
    const tasks = tasksQuery.docs.map(doc => ({id: doc.id, ...doc.data()}));

    const employeeWorkloads = {};
    departmentUsers.forEach(user => {
      employeeWorkloads[user.email] = {
        name: user.name,
        'To Do': 0, 'Ongoing': 0, 'Pending Review': 0, 'Completed': 0, 'Total': 0, 'Overdue': 0,
        tasks: []
      };
    });

    const projectIds = [...new Set(tasks.map(t => t.projectId).filter(Boolean))];
    const projectRefs = projectIds.map(id => db.collection('projects').doc(id));
    const projectDocs = projectRefs.length > 0 ? await db.getAll(...projectRefs) : [];
    const projectMap = projectDocs.reduce((acc, doc) => {
      if (doc.exists) acc[doc.id] = doc.data().name;
      return acc;
    }, {});

    tasks.forEach(task => {
      const assignee = task.assignedTo;
      if (employeeWorkloads[assignee]) {
        const status = normalizeStatus(task.status);
        employeeWorkloads[assignee][status]++;
        employeeWorkloads[assignee]['Total']++;
        if (isOverdue(task)) {
          employeeWorkloads[assignee]['Overdue']++;
        }
        employeeWorkloads[assignee].tasks.push({
          id: task.id,
          title: task.title,
          status: status,
          priority: task.priority,
          dueDate: task.dueDate || null,
          projectName: projectMap[task.projectId] || 'N/A'
        });
      }
    });

    const report = {
      title: `${department} Department Report`,
      type: 'department',
      generatedAt: new Date().toISOString(),
      employeeWorkloads,
      totalTasks: tasksQuery.size,
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
    const perms = await getUserPermissions(requesterId);

    if (!perms.canViewCompany) {
      return res.status(403).json({ success: false, message: "Forbidden: Only Directors and HR can generate company-wide reports." });
    }

    // Handle multiple department filtering
    const { departments } = req.query;
    let tasksSnapshot;
    
    if (departments && departments !== 'ALL') {
      const deptArray = departments.split(',').map(d => d.trim()).filter(d => d && d !== 'ALL');
      
      if (deptArray.length === 0) {
        tasksSnapshot = await db.collection('tasks').get();
      } else if (deptArray.length === 1) {
        tasksSnapshot = await db.collection('tasks').where('taskOwnerDepartment', '==', deptArray[0]).get();
      } else {
        tasksSnapshot = await db.collection('tasks').get(); // Fetch all and filter in memory
      }
    } else if (department && department !== 'ALL') { // Backward compatibility for single 'department' param
      tasksSnapshot = await db.collection('tasks').where('taskOwnerDepartment', '==', department).get();
    } else {
      tasksSnapshot = await db.collection('tasks').get();
    }
     
    let tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filter by multiple departments if needed (when using departments parameter and multiple were selected)
    if (departments && departments !== 'ALL') {
      const deptArray = departments.split(',').map(d => d.trim()).filter(d => d && d !== 'ALL');
      if (deptArray.length > 1) {
        tasks = tasks.filter(task => deptArray.includes(task.taskOwnerDepartment));
      }
    }

    // Manual date filtering
    if (startDate) tasks = tasks.filter(t => t.createdAt && t.createdAt.toDate() >= new Date(startDate));
    if (endDate) tasks = tasks.filter(t => t.createdAt && t.createdAt.toDate() <= new Date(endDate));
    
    const departmentStats = {};
    let totalOverdue = 0;
    const statusCounts = { 'To Do': 0, 'Ongoing': 0, 'Pending Review': 0, 'Completed': 0 };

    tasks.forEach(task => {
      const dept = task.taskOwnerDepartment || 'Uncategorized';
      if (!departmentStats[dept]) {
        departmentStats[dept] = { name: dept, total: 0, completed: 0, overdue: 0 };
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
      title: department && department !== 'ALL' ? `${department} Department Report` : "Company-Wide Report",
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

