// backend/src/routes/categoriesRouter.js

const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categoriesController');
const { verifyToken, checkRole } = require('../middleware/auth');

// Get all global categories - accessible to all authenticated users
router.get('/', verifyToken, categoriesController.getAllCategories);

// Create a new global category - only manager and director
router.post('/', verifyToken, checkRole('manager', 'director'), categoriesController.createCategory);

// Delete a global category - only manager and director
router.delete('/:name', verifyToken, checkRole('manager', 'director'), categoriesController.deleteCategory);

module.exports = router;