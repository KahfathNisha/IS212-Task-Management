// backend/src/routes/categoriesRouter.js

const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categoriesController');
const { verifyToken, checkRole } = require('../middleware/auth');

// Get all global categories - accessible to all authenticated users
router.get('/', verifyToken, categoriesController.getAllCategories);

// Create a new global category - director, manager, and staff
router.post('/', verifyToken, checkRole('director', 'manager', 'staff'), categoriesController.createCategory);

// Delete a global category - director, manager, and staff
router.delete('/:name', verifyToken, checkRole('director', 'manager', 'staff'), categoriesController.deleteCategory);

module.exports = router;