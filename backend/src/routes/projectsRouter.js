const express = require('express');
const router = express.Router();
const projectsController = require('../controllers/projectsController');
const { verifyToken } = require('../middleware/auth.js');

router.get('/', verifyToken, projectsController.getAllProjects);
router.get('/:id', verifyToken, projectsController.getProject);

// Category management routes
router.post('/:id/categories', verifyToken, projectsController.addCategory);
router.delete('/:id/categories/:category', verifyToken, projectsController.removeCategory);

module.exports = router;