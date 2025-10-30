const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
// 1. Import the middleware
const { verifyToken } = require('../middleware/auth.js');

// Create a new task
router.post('/', verifyToken, taskController.createTask);

// Get all tasks
router.get('/', verifyToken, taskController.getAllTasks);

// Get all recurring tasks
router.get('/recurring', verifyToken, taskController.getAllRecurringTasks);

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

// 2. Add the middleware ONLY to the updateTask route
router.put('/:id', verifyToken, taskController.updateTask);

// Update recurrence rules for a recurring task
router.put('/recurring/:id', verifyToken, taskController.updateRecurringTask);

module.exports = router;
