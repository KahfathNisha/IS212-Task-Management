const express = require('express');
const router = express.Router();
const projectsController = require('../controllers/projectsController');
const { verifyToken } = require('../middleware/auth.js');

router.get('/', verifyToken, projectsController.getAllProjects);
router.get('/:id', verifyToken, projectsController.getProject);
router.post('/', verifyToken, projectsController.createProject);
router.put('/:id', verifyToken, projectsController.updateProject);

module.exports = router;