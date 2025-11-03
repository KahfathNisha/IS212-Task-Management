const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication middleware to all report routes
// This route will generate a progress report for a specific project.
// Example: GET /api/reports/project/abc-123-xyz
router.get('/project/:projectId', verifyToken, reportsController.generateProjectReport);
router.get('/department', verifyToken, reportsController.generateDepartmentReport);
router.get('/company', verifyToken, reportsController.generateCompanyReport);
router.get('/individual', verifyToken, reportsController.generateIndividualReport);

module.exports = router;
