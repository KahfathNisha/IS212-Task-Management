const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
// 1. Import the middleware
const { verifyToken } = require('../middleware/auth.js');

// Create a new task
router.post('/', taskController.createTask);

// Get all tasks
router.get('/', taskController.getAllTasks);

// Get all recurring tasks
router.get('/recurring', taskController.getAllRecurringTasks);

// Get a specific task by ID
router.get('/:id', taskController.getTask);

// Update task status
router.put('/:id/status', taskController.updateTaskStatus);

// Assign a task
router.put('/:id/assign', taskController.assignTask);

// Archive (soft-delete) a task
router.put('/:id/archive', taskController.archiveTask);

// Unarchive a task
router.put('/:id/unarchive', taskController.unarchiveTask);

// 2. Add the middleware ONLY to the updateTask route
router.put('/:id', verifyToken, taskController.updateTask);

// Update recurrence rules for a recurring task
router.put('/recurring/:id', taskController.updateRecurringTask);

module.exports = router;




