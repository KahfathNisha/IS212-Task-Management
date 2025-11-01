const { db } = require('../config/firebase');

/**
 * Helper function to normalize task status
 */
const normalizeStatus = (s) => {
  const val = (s || '').toString().toLowerCase();
  if (val === 'ongoing' || val === 'in progress' || val === 'progress') return 'Ongoing';
  if (val === 'pending review' || val === 'pending') return 'Pending Review';
  if (val === 'completed' || val === 'complete' || val === 'done') return 'Completed';
  if (val === 'unassigned' || val === 'to do' || val === 'todo' || val === 'not started') return 'Unassigned';
  return 'Unassigned';
};

/**
 * Helper function to check if task is overdue
 */
const isOverdue = (dueDate, status) => {
  if (status === 'Completed' || !dueDate) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
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
      'individual': true, // Can view individual reports of employees in their department
      'project': false,
      'department': true,
      'company': false
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

    if (!requesterId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Requester ID is required.' });
    }

    const [projectDoc, userDoc] = await Promise.all([
      db.collection('projects').doc(projectId).get(),
      db.collection('Users').doc(requesterId).get()
    ]);

    if (!projectDoc.exists) return res.status(404).json({ success: false, message: 'Project not found.' });
    if (!userDoc.exists) return res.status(403).json({ success: false, message: 'Forbidden: Requester profile not found.' });

    const projectData = projectDoc.data();
    const userData = userDoc.data();
    const userRole = userData.role?.toLowerCase();

    // RBAC: Check if user has permission for project reports
    if (!checkReportPermission(userRole, 'project')) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to generate project reports.' });
    }

    // Staff can only view projects they are members of
    if (userRole === 'staff') {
      const isMember = projectData.members && projectData.members.includes(requesterId);
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'Forbidden: You must be a member of this project to view its report.' });
      }
    }
    // Managers can view projects in their department or where they are a member
    if (userRole === 'manager') {
      const sameDepartment = projectData.department && userData.department && projectData.department === userData.department;
      const isMember = projectData.members && projectData.members.includes(requesterId);
      if (!sameDepartment && !isMember) {
        return res.status(403).json({ success: false, message: 'Forbidden: Managers may view only projects in their department or where they are a member.' });
      }
    }

    const tasksSnapshot = await db.collection('tasks').where('projectId', '==', projectId).get();
    const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Batch fetch assignee info for all assigned emails
    const assigneeEmails = Array.from(new Set(tasks.map(t => t.assignedTo).filter(Boolean)));
    const userDocs = await Promise.all(assigneeEmails.map(email => db.collection('Users').doc(email).get()));
    const emailToUser = {};
    userDocs.forEach(doc => {
      if (doc.exists) emailToUser[doc.id] = {
        name: doc.data().name || doc.id.split('@')[0],
        email: doc.id,
        department: doc.data().department || '',
      };
    });
    // Attach assignee info to tasks
    const richerTasks = tasks.map(task => ({
      ...task,
      assignee: task.assignedTo ? (emailToUser[task.assignedTo] || { name: task.assignedTo.split('@')[0], email: task.assignedTo }) : null,
    }));

    const totalTasks = richerTasks.length;
    const statusCounts = {};
    const memberWorkload = {};
    const projectMembers = new Set(projectData.members || []);

    // Enhanced task data with overdue status and timeline info
    let overdueCount = 0;
    richerTasks.forEach(task => {
      const status = normalizeStatus(task.status);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      // Check if overdue
      if (isOverdue(task.dueDate, task.status)) {
        overdueCount++;
        task.isOverdue = true;
        task.isAtRisk = false; // Overdue tasks are not at risk, they're already overdue
      } else if (task.dueDate && task.status !== 'Completed') {
        // At-risk: due within 3 days and not completed
        const due = new Date(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
        task.isAtRisk = daysUntilDue <= 3 && daysUntilDue > 0;
      }
      
      // Team member allocation (show all assigned members)
      if (task.assignedTo) {
        memberWorkload[task.assignedTo] = (memberWorkload[task.assignedTo] || 0) + 1;
      }
    });
    
    const report = {
        projectId: projectDoc.id,
        projectName: projectData.name,
        generatedAt: new Date().toISOString(),
        summary: { 
          totalTasks, 
          statusCounts, 
          memberWorkload,
          overdueCount,
          overduePercentage: totalTasks > 0 ? ((overdueCount / totalTasks) * 100).toFixed(1) : 0
        },
        tasks: richerTasks,
    };
    res.status(200).json({ success: true, report });

  } catch (error) {
    console.error('Error generating project report:', error);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// --- NEW FUNCTION FOR HR ---
/**
 * Generates a workload distribution report for a specific department (for HR).
 */
exports.generateDepartmentReport = async (req, res) => {
  let department = req.query.department;
  let requesterId = req.query.requesterId;
  console.log('--- Incoming dept report request ---');
  console.log('Queried Department:', department);
  console.log('Requester ID:', requesterId);
  try {
    if (!department) {
      console.log('Department param missing!');
      return res.status(400).json({ success: false, message: 'Department is required.' });
    }
    if (!requesterId) {
      console.log('Requester ID missing!');
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }
    // Authorization: Check RBAC for department reports
    const userDoc = await db.collection('Users').doc(requesterId).get();
    if (!userDoc.exists) {
      return res.status(403).json({ success: false, message: 'Forbidden: Requester profile not found.' });
    }
    
    const userRole = userDoc.data().role?.toLowerCase();
    if (!checkReportPermission(userRole, 'department')) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to generate department reports.' });
    }
    
    // HR can only view their own department, Managers can view their department, Directors can view all
    if (userRole === 'hr') {
      const userData = userDoc.data();
      if (department !== 'ALL' && department !== userData.department) {
        return res.status(403).json({ success: false, message: 'Forbidden: HR can only view reports for their own department.' });
      }
    }
    if (userRole === 'manager') {
      const userData = userDoc.data();
      if (department !== 'ALL' && department !== userData.department) {
        return res.status(403).json({ success: false, message: 'Forbidden: Managers can only view reports for their own department.' });
      }
    }

    // Query users by department
    console.log('Querying users with department:', department);
    let usersSnapshot;
    if (department === 'ALL') {
      usersSnapshot = await db.collection('Users').get();
    } else {
      usersSnapshot = await db.collection('Users').where('department', '==', department).get();
    }
    const departmentUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const userEmails = departmentUsers.map(user => user.email);
    console.log(`[DeptReport] Found users:`, userEmails);
    if (userEmails.length === 0) {
      console.log('No users found for department:', department);
      return res.status(200).json({ success: true, report: { departmentName: department, generatedAt: new Date().toISOString(), employeeWorkloads: {}, totalTasks: 0 } });
    }

    // Query tasks for department or all
    console.log('Querying tasks with taskOwnerDepartment or ALL');
    let tasksSnapshot;
    if (department === 'ALL') {
      tasksSnapshot = await db.collection('tasks').get();
    } else {
      tasksSnapshot = await db.collection('tasks').where('taskOwnerDepartment', '==', department).get();
    }
    const allTasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`[DeptReport] Found tasks:`, allTasks.map(t => t.id));

    // Batch fetch project names
    const projectIdSet = new Set(allTasks.map(task => task.projectId).filter(Boolean));
    const projectIdArr = Array.from(projectIdSet);
    const projectDocs = await Promise.all(projectIdArr.map(projectId => db.collection('projects').doc(projectId).get()));
    const projectIdNameMap = {};
    for (const doc of projectDocs) {
      if (doc.exists) projectIdNameMap[doc.id] = doc.data().name || doc.id;
    }

    // Initialize workloads
    const employeeWorkloads = {};
    userEmails.forEach(email => {
      employeeWorkloads[email] = {
        'Ongoing': 0,
        'Pending Review': 0,
        'Completed': 0,
        'Unassigned': 0,
        'Total': 0,
        'name': departmentUsers.find(u => u.email === email)?.name || email.split('@')[0],
        'tasks': [],
      };
    });

    // Tally
    allTasks.forEach(task => {
      const assignee = task.assignedTo; // single string
      const normStatus = normalizeStatus(task.status);
      if (employeeWorkloads[assignee]) {
        employeeWorkloads[assignee][normStatus] = (employeeWorkloads[assignee][normStatus] || 0) + 1;
        employeeWorkloads[assignee]['Total']++;
        employeeWorkloads[assignee]['tasks'].push({
          id: task.id,
          title: task.title || '',
          status: normStatus,
          dueDate: task.dueDate || null,
          priority: task.priority || '',
          projectId: task.projectId || '',
          projectName: task.projectId ? (projectIdNameMap[task.projectId] || task.projectId) : '',
        });
      }
    });

    const report = {
      departmentName: department === 'ALL' ? 'Company (All)' : department,
      generatedAt: new Date().toISOString(),
      employeeWorkloads,
      totalTasks: tasksSnapshot.size,
    };

    res.status(200).json({ success: true, report });
    console.log(`Successfully returned department report for:`, department);
  } catch (error) {
    console.error('❌ [Dept Report OUTER ERROR]', error.message, error.stack, 'Values:', { department, requesterId });
    res.status(500).json({ success: false, message: `[Outer] Server error: ${error.message}` });
  }
};

/**
 * Generates a company-wide performance report (Director only).
 * Shows all tasks from all departments with filtering options.
 */
exports.generateCompanyReport = async (req, res) => {
  try {
    const { requesterId, department, startDate, endDate } = req.query;

    if (!requesterId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Requester ID is required.' });
    }

    // Authorization: Only Directors can generate company reports
    const userDoc = await db.collection('Users').doc(requesterId).get();
    if (!userDoc.exists) {
      return res.status(403).json({ success: false, message: 'Forbidden: Requester profile not found.' });
    }

    const userRole = userDoc.data().role?.toLowerCase();
    if (!checkReportPermission(userRole, 'company')) {
      return res.status(403).json({ success: false, message: 'Forbidden: Only directors can generate company performance reports.' });
    }

    // Build query for tasks
    let tasksQuery = db.collection('tasks');
    
    // Filter by department if provided
    if (department && department !== 'ALL') {
      tasksQuery = tasksQuery.where('taskOwnerDepartment', '==', department);
    }

    const tasksSnapshot = await tasksQuery.get();
    let tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter by date range if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      tasks = tasks.filter(task => {
        if (!task.createdAt) return false;
        const taskDate = new Date(task.createdAt);
        
        if (start && taskDate < start) return false;
        if (end && taskDate > end) return false;
        return true;
      });
    }

    // Calculate metrics
    const totalTasks = tasks.length;
    let overdueCount = 0;
    const statusCounts = {};
    const departmentCounts = {};
    
    tasks.forEach(task => {
      const status = normalizeStatus(task.status);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      if (isOverdue(task.dueDate, task.status)) {
        overdueCount++;
      }
      
      const dept = task.taskOwnerDepartment || 'Unassigned';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });

    const overduePercentage = totalTasks > 0 ? ((overdueCount / totalTasks) * 100).toFixed(1) : 0;

    // Get all departments for filter dropdown
    const departmentsSnapshot = await db.collection('Users').get();
    const allDepartments = new Set();
    departmentsSnapshot.docs.forEach(doc => {
      const dept = doc.data().department;
      if (dept) allDepartments.add(dept);
    });

    const report = {
      reportType: 'company',
      generatedAt: new Date().toISOString(),
      filters: {
        department: department || 'ALL',
        startDate: startDate || null,
        endDate: endDate || null
      },
      summary: {
        totalTasks,
        overdueCount,
        overduePercentage: parseFloat(overduePercentage),
        statusCounts,
        departmentCounts,
        availableDepartments: Array.from(allDepartments)
      },
      tasks: tasks.slice(0, 100) // Limit to first 100 tasks for response size
    };

    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error('Error generating company report:', error);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

/**
 * Generates an individual progress report for a specific team member (Manager/HR).
 */
exports.generateIndividualReport = async (req, res) => {
  try {
    const { employeeEmail, requesterId, startDate, endDate } = req.query;

    if (!requesterId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Requester ID is required.' });
    }

    if (!employeeEmail) {
      return res.status(400).json({ success: false, message: 'Employee email is required.' });
    }

    // Authorization check
    const [requesterDoc, employeeDoc] = await Promise.all([
      db.collection('Users').doc(requesterId).get(),
      db.collection('Users').doc(employeeEmail).get()
    ]);

    if (!requesterDoc.exists) {
      return res.status(403).json({ success: false, message: 'Forbidden: Requester profile not found.' });
    }

    if (!employeeDoc.exists) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const requesterRole = requesterDoc.data().role?.toLowerCase();
    const requesterDept = requesterDoc.data().department;
    const employeeDept = employeeDoc.data().department;

    // RBAC: Check permissions
    // Staff can only view their own individual report, managers/HR/directors can view others
    if (requesterRole === 'staff') {
      // Staff can only view their own report
      if (requesterId !== employeeEmail) {
        return res.status(403).json({ success: false, message: 'Forbidden: Staff can only view their own individual performance report.' });
      }
    } else if (!checkReportPermission(requesterRole, 'individual')) {
      // Other roles need explicit permission
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to generate individual reports.' });
    }

    // HR can only view employees in their department
    if (requesterRole === 'hr') {
      if (employeeDept !== requesterDept) {
        return res.status(403).json({ success: false, message: 'Forbidden: HR can only view reports for employees in their department.' });
      }
    }

    // Managers can view employees in their department
    if (requesterRole === 'manager') {
      if (employeeDept !== requesterDept) {
        return res.status(403).json({ success: false, message: 'Forbidden: Managers can only view reports for employees in their department.' });
      }
    }

    // Query tasks assigned to this employee
    // Check both assignedTo and assigneeId fields as tasks may use either
    const [tasksSnapshot1, tasksSnapshot2] = await Promise.all([
      db.collection('tasks').where('assignedTo', '==', employeeEmail).get(),
      db.collection('tasks').where('assigneeId', '==', employeeEmail).get()
    ]);
    
    // Combine results and remove duplicates
    const allTasksDocs = [...tasksSnapshot1.docs, ...tasksSnapshot2.docs];
    const uniqueTasksMap = new Map();
    allTasksDocs.forEach(doc => {
      uniqueTasksMap.set(doc.id, doc);
    });
    
    let tasks = Array.from(uniqueTasksMap.values()).map(doc => {
      const taskData = doc.data();
      // Normalize: if task has assigneeId but not assignedTo, use assigneeId as assignedTo for consistency
      if (taskData.assigneeId && !taskData.assignedTo) {
        taskData.assignedTo = taskData.assigneeId;
      }
      return { id: doc.id, ...taskData };
    });
    
    // Filter out archived tasks (if archived field exists and is true)
    tasks = tasks.filter(task => task.archived !== true);
    
    // Debug logging to help troubleshoot
    console.log(`[IndividualReport] Found ${tasks.length} tasks for ${employeeEmail}`, {
      byAssignedTo: tasksSnapshot1.size,
      byAssigneeId: tasksSnapshot2.size,
      statusBreakdown: tasks.reduce((acc, t) => {
        const status = normalizeStatus(t.status);
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {})
    });

    // Filter by date range if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      tasks = tasks.filter(task => {
        if (!task.createdAt) return false;
        const taskDate = new Date(task.createdAt);
        if (start && taskDate < start) return false;
        if (end && taskDate > end) return false;
        return true;
      });
    }

    // Calculate metrics
    const totalTasks = tasks.length;
    let completedCount = 0;
    let overdueCount = 0;
    const statusCounts = {};
    const timeMetrics = [];
    let totalTimeDays = 0;

    tasks.forEach(task => {
      const status = normalizeStatus(task.status);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      if (status === 'Completed') {
        completedCount++;
      }
      
      if (isOverdue(task.dueDate, task.status)) {
        overdueCount++;
      }

      // Calculate time taken per task (only for completed tasks)
      // Use normalized status to be consistent
      if (status === 'Completed' && task.createdAt && task.updatedAt) {
        const created = new Date(task.createdAt);
        const updated = new Date(task.updatedAt);
        const days = Math.ceil((updated - created) / (1000 * 60 * 60 * 24));
        timeMetrics.push({
          taskId: task.id,
          taskTitle: task.title || 'Untitled',
          daysTaken: days
        });
        totalTimeDays += days;
      }
    });

    const completionRate = totalTasks > 0 ? ((completedCount / totalTasks) * 100).toFixed(1) : 0;
    const avgTimePerTask = completedCount > 0 ? (totalTimeDays / completedCount).toFixed(1) : 0;

    const employeeData = employeeDoc.data();

    const report = {
      reportType: 'individual',
      generatedAt: new Date().toISOString(),
      employee: {
        email: employeeEmail,
        name: employeeData.name || employeeEmail.split('@')[0],
        department: employeeData.department || 'Unassigned'
      },
      filters: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      metrics: {
        totalTasks,
        completedCount,
        overdueCount,
        completionRate: parseFloat(completionRate),
        avgTimePerTask: parseFloat(avgTimePerTask),
        statusCounts
      },
      timeBreakdown: timeMetrics.slice(0, 20), // Top 20 completed tasks
      tasks: tasks.slice(0, 50) // Limit response size
    };

    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error('Error generating individual report:', error);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

