const { db } = require('../config/firebase');

// Get all global categories
const getAllCategories = async (req, res) => {
  try {
    console.log('📦 [getAllCategories] Fetching all categories');
    const categoriesRef = db.collection('categories');
    const snapshot = await categoriesRef.get();
    
    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort alphabetically by name
    categories.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`✅ [getAllCategories] Returning ${categories.length} categories`);
    res.json(categories);
  } catch (error) {
    console.error('❌ [getAllCategories] Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create a new global category
const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    
    console.log('📝 [createCategory] Creating category:', { name, user: req.user.email });
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    const categoryName = name.trim();
    
    // Check if category already exists
    const existingCategory = await db.collection('categories')
      .where('name', '==', categoryName)
      .get();
    
    if (!existingCategory.empty) {
      console.log('⚠️ [createCategory] Category already exists:', categoryName);
      return res.status(400).json({ error: 'Category already exists' });
    }
    
    // Create the category
    const categoryRef = await db.collection('categories').add({
      name: categoryName,
      createdAt: new Date(),
      createdBy: req.user.email
    });
    
    const category = {
      id: categoryRef.id,
      name: categoryName,
      createdAt: new Date(),
      createdBy: req.user.email
    };
    
    console.log('✅ [createCategory] Created successfully:', category);
    res.status(201).json(category);
  } catch (error) {
    console.error('❌ [createCategory] Error creating category:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a global category
const deleteCategory = async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    // Find the category document
    const categorySnapshot = await db.collection('categories')
      .where('name', '==', decodeURIComponent(name))
      .get();
    
    if (categorySnapshot.empty) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Delete the category
    await categorySnapshot.docs[0].ref.delete();
    
    // Categories are task-level only, no need to clean up projects
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllCategories,
  createCategory,
  deleteCategory
};