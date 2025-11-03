const express = require('express');
const router = express.Router();
const departmentsController = require('../controllers/departmentsController');
const { verifyToken } = require('../middleware/auth');

// Get all departments - accessible to all authenticated users
router.get('/', verifyToken, departmentsController.getAllDepartments);

module.exports = router;

