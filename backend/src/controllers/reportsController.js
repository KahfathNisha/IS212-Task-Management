const { db } = require('../config/firebase');

/**
 * Generates a detailed progress report for a specific project.
 * This version aligns with the Firestore structure where projects have a 'members' array.
 * Fulfills user stories SCRUM-81, 82, 85, 86.
 */
exports.generateProjectReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    // The user's email should be sent for authorization.
    const { requesterId } = req.query;

    if (!requesterId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Requester ID is required.' });
    }

    // --- Authorization (SCRUM-85) ---
    // 1. Fetch the project and the user's profile simultaneously.
    const projectRef = db.collection('projects').doc(projectId);
    const userRef = db.collection('users').doc(requesterId);
    
    const [projectDoc, userDoc] = await Promise.all([projectRef.get(), userRef.get()]);

    // 2. Check if the project and user exist.
    if (!projectDoc.exists) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    if (!userDoc.exists) {
        return res.status(403).json({ success: false, message: 'Forbidden: Requester profile not found.' });
    }

    const projectData = projectDoc.data();
    const userData = userDoc.data();

    // 3. Verify the user is a manager AND a member of the project.
    if (userData.role !== 'manager' && userData.role !== 'director') {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to generate reports.' });
    }
    if (!projectData.members || !projectData.members.includes(requesterId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: You are not a member of this project.' });
    }

    // --- Data Fetching (SCRUM-81) ---
    // Get all tasks associated with this project.
    const tasksSnapshot = await db.collection('tasks').where('projectId', '==', projectId).get();
    const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // --- Data Aggregation (SCRUM-82 & 86) ---
    const totalTasks = tasks.length;
    const statusCounts = {};
    const memberWorkload = {};
    const projectMembers = new Set(projectData.members);

    tasks.forEach(task => {
      // Count tasks by status
      const status = task.status || 'Unassigned';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Count tasks by team member
      if (task.assignedTo && task.assignedTo.length > 0) {
        task.assignedTo.forEach(memberId => {
          // Only count workload for members of this project
          if (projectMembers.has(memberId)) {
            memberWorkload[memberId] = (memberWorkload[memberId] || 0) + 1;
          }
        });
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
      },
      tasks, // The detailed list of all tasks for SCRUM-81
    };

    res.status(200).json({ success: true, report });

  } catch (error) {
    console.error('Error generating project report:', error);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

