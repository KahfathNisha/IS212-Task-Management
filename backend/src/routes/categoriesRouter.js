// backend/src/routes/categoriesRouter.js

const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categoriesController');
const { verifyToken } = require('../middleware/auth');

// Get all global categories
router.get('/', verifyToken, categoriesController.getAllCategories);

// Create a new global category
router.post('/', verifyToken, categoriesController.createCategory);

// Delete a global category
router.delete('/:name', verifyToken, categoriesController.deleteCategory);

module.exports = router;