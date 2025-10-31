const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');

// This route will generate a progress report for a specific project.
// Example: GET /api/reports/project/abc-123-xyz
router.get('/project/:projectId', reportsController.generateProjectReport);
router.get('/department', reportsController.generateDepartmentReport);

module.exports = router;
