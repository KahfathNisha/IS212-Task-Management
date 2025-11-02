const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
// 1. Import the middleware
const { verifyToken, checkRole } = require('../middleware/auth.js');

// Create a new task
router.post('/', verifyToken, (req, res, next) => {
  const userRole = req.user?.role;
  const userEmail = req.user?.email;
  // The frontend should set taskOwner, but use userEmail as fallback for robustness.
  const taskOwnerInPayload = req.body.taskOwner; 
  
  // Apply granular ownership check for HR role.
  if (userRole === 'hr') {
    // HR is only allowed to create a task if the task owner in the payload 
    // matches the authenticated user's email.
    if (taskOwnerInPayload !== userEmail) {
      console.log(`[HR Block] HR user (${userEmail}) tried to create a task for another owner: ${taskOwnerInPayload}`);
      // Return a 403 error for unauthorized creation attempt
      return res.status(403).json({ message: 'HR users can only create tasks for themselves.' });
    }
    // If taskOwner matches authenticated user, proceed.
    console.log(`[HR Allow] HR user (${userEmail}) creating task for self. Proceeding.`);
    return next();
  }

  // All non-HR roles (Staff, Manager, Director) proceed directly.
  next();
}, taskController.createTask);

// Get all tasks
router.get('/', verifyToken, taskController.getAllTasks);

// Get all recurring tasks
router.get('/recurring', verifyToken, taskController.getAllRecurringTasks);

// Get archived tasks
router.get('/archived', taskController.getArchivedTasks);

// Get tasks by project ID
router.get('/project/:projectId', taskController.getTasksByProject);

// Get a specific task by ID
router.get('/:id', verifyToken, taskController.getTask);

// Update task status
router.put('/:id/status', verifyToken, taskController.updateTaskStatus);

// Assign a task
router.put('/:id/assign', verifyToken, taskController.assignTask);

// Archive (soft-delete) a task
router.put('/:id/archive', verifyToken, taskController.archiveTask);

// Unarchive a task
router.put('/:id/unarchive', verifyToken, taskController.unarchiveTask);

// Update recurrence rules for a recurring task
router.put('/recurring/:id', verifyToken, taskController.updateRecurringTask);

router.put('/:id', verifyToken, taskController.updateTask);

module.exports = router;