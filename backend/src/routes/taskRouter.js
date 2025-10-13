const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

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

// Add this line to your routes file
router.put('/:id', taskController.updateTask);

module.exports = router;




