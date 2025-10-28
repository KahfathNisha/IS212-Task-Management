const { db } = require('../config/firebase');

// Get all global categories
const getAllCategories = async (req, res) => {
  try {
    const categoriesRef = db.collection('categories');
    const snapshot = await categoriesRef.orderBy('name').get();
    
    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create a new global category
const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    const categoryName = name.trim();
    
    // Check if category already exists
    const existingCategory = await db.collection('categories')
      .where('name', '==', categoryName)
      .get();
    
    if (!existingCategory.empty) {
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
    
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
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
    
    // Also remove this category from all projects
    const projectsRef = db.collection('projects');
    const projectsSnapshot = await projectsRef
      .where('categories', 'array-contains', decodeURIComponent(name))
      .get();
    
    const batch = db.batch();
    projectsSnapshot.docs.forEach(doc => {
      const updatedCategories = doc.data().categories.filter(
        cat => cat !== decodeURIComponent(name)
      );
      batch.update(doc.ref, { categories: updatedCategories });
    });
    
    await batch.commit();
    
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