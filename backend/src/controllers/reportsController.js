const { db } = require('../config/firebase');

/**
 * Generates a progress report for a specific project (for Managers/Directors).
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
      db.collection('users').doc(requesterId).get()
    ]);

    if (!projectDoc.exists) return res.status(404).json({ success: false, message: 'Project not found.' });
    if (!userDoc.exists) return res.status(403).json({ success: false, message: 'Forbidden: Requester profile not found.' });

    const projectData = projectDoc.data();
    const userData = userDoc.data();

    if (userData.role !== 'manager' && userData.role !== 'director') {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to generate reports.' });
    }
    // Allow directors to access all projects; managers must be members
    const isDirector = userData.role === 'director';
    if (!isDirector) {
      if (!projectData.members || !projectData.members.includes(requesterId)) {
        return res.status(403).json({ success: false, message: 'Forbidden: You are not a member of this project.' });
      }
    }

    const tasksSnapshot = await db.collection('tasks').where('projectId', '==', projectId).get();
    const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Batch fetch assignee info for all assigned emails
    const assigneeEmails = Array.from(new Set(tasks.map(t => t.assignedTo).filter(Boolean)));
    const userDocs = await Promise.all(assigneeEmails.map(email => db.collection('users').doc(email).get()));
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

    richerTasks.forEach(task => {
      const status = task.status || 'Unassigned';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      if (task.assignedTo && (isDirector || projectMembers.has(task.assignedTo))) {
        memberWorkload[task.assignedTo] = (memberWorkload[task.assignedTo] || 0) + 1;
      }
    });
    
    const report = {
        projectId: projectDoc.id,
        projectName: projectData.name,
        generatedAt: new Date().toISOString(),
        summary: { totalTasks, statusCounts, memberWorkload },
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
    // Authorization: Check if requester is HR
    const userDoc = await db.collection('users').doc(requesterId).get();
    if (!userDoc.exists || userDoc.data().role !== 'hr') {
      console.log('Requester is not HR, forbidden. Role:', userDoc.data()?.role);
      return res.status(403).json({ success: false, message: 'Forbidden: Only HR can generate this report.' });
    }

    // Normalize status to four categories
    const normalizeStatus = (s) => {
      const val = (s || '').toString().toLowerCase();
      if (val === 'ongoing' || val === 'in progress' || val === 'progress') return 'Ongoing';
      if (val === 'pending review' || val === 'pending') return 'Pending Review';
      if (val === 'completed' || val === 'complete' || val === 'done') return 'Completed';
      if (val === 'unassigned' || val === 'to do' || val === 'todo' || val === 'not started') return 'Unassigned';
      return 'Unassigned';
    };

    // Query users by department
    console.log('Querying users with department:', department);
    const usersSnapshot = await db.collection('users').where('department', '==', department).get();
    const departmentUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const userEmails = departmentUsers.map(user => user.email);
    console.log(`[DeptReport] Found users:`, userEmails);
    if (userEmails.length === 0) {
      console.log('No users found for department:', department);
      return res.status(200).json({ success: true, report: { departmentName: department, generatedAt: new Date().toISOString(), employeeWorkloads: {}, totalTasks: 0 } });
    }

    // Query tasks for department
    console.log('Querying tasks with taskOwnerDepartment:', department);
    const tasksSnapshot = await db.collection('tasks').where('taskOwnerDepartment', '==', department).get();
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
      departmentName: department,
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

