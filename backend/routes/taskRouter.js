const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

router.post('/', taskController.createTask);
router.get('/:id', taskController.getTask);
router.patch('/:id/status', taskController.updateTaskStatus);
router.patch('/:id/assign', taskController.assignTask);
router.patch('/:id/archive', taskController.archiveTask);

module.exports = router;


