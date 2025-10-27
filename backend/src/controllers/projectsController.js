const { db } = require('../config/firebase');

// Get all projects
exports.getAllProjects = async (req, res) => {
  try {
    const { email, role, department } = req.user;
    
    console.log('📦 Fetching projects for:', email, '| Role:', role);
    
    const projectsRef = db.collection('projects');
    let projects = [];
    
    if (role === 'director' || role === 'hr') {
      // Directors and HR see all projects
      const snapshot = await projectsRef.where('isDeleted', '==', false).get();
      projects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      }));
      
    } else if (role === 'manager') {
      // Managers see department projects + member projects
      const deptSnapshot = await projectsRef
        .where('department', '==', department)
        .where('isDeleted', '==', false)
        .get();
      
      const memberSnapshot = await projectsRef
        .where('members', 'array-contains', email)
        .where('isDeleted', '==', false)
        .get();
      
      const projectMap = new Map();
      deptSnapshot.docs.forEach(doc => {
        projectMap.set(doc.id, {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        });
      });
      
      memberSnapshot.docs.forEach(doc => {
        projectMap.set(doc.id, {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        });
      });
      
      projects = Array.from(projectMap.values());
      
    } else {
      // Staff see only projects they're members of
      const snapshot = await projectsRef
        .where('members', 'array-contains', email)
        .where('isDeleted', '==', false)
        .get();
      
      projects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      }));
    }
    
    // Sort by createdAt
    projects.sort((a, b) => b.createdAt - a.createdAt);
    
    console.log('✅ Found', projects.length, 'projects');
    res.status(200).json(projects);
    
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get single project
exports.getProject = async (req, res) => {
  try {
    const projectDoc = await db.collection('projects').doc(req.params.id).get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const projectData = {
      id: projectDoc.id,
      ...projectDoc.data(),
      createdAt: projectDoc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: projectDoc.data().updatedAt?.toDate?.() || new Date(),
    };
    
    res.status(200).json(projectData);
  } catch (error) {
    console.error('❌ Error fetching project:', error);
    res.status(500).json({ error: error.message });
  }
};

// Add category to project
exports.addCategory = async (req, res) => {
  try {
    const projectId = req.params.id;
    const { category } = req.body;
    
    if (!category || !category.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    const projectRef = db.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const projectData = projectDoc.data();
    const categories = projectData.categories || [];
    
    // Check if category already exists
    if (categories.includes(category)) {
      return res.status(400).json({ message: 'Category already exists in this project' });
    }
    
    // Add category
    categories.push(category);
    
    await projectRef.update({
      categories: categories,
      updatedAt: new Date()
    });
    
    console.log(`✅ Added category "${category}" to project ${projectId}`);
    res.status(200).json({ 
      message: 'Category added successfully',
      categories: categories 
    });
    
  } catch (error) {
    console.error('❌ Error adding category:', error);
    res.status(500).json({ error: error.message });
  }
};

// Remove category from project
exports.removeCategory = async (req, res) => {
  try {
    const projectId = req.params.id;
    const category = decodeURIComponent(req.params.category);
    
    const projectRef = db.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const projectData = projectDoc.data();
    const categories = projectData.categories || [];
    
    // Remove category
    const updatedCategories = categories.filter(cat => cat !== category);
    
    await projectRef.update({
      categories: updatedCategories,
      updatedAt: new Date()
    });
    
    console.log(`✅ Removed category "${category}" from project ${projectId}`);
    res.status(200).json({ 
      message: 'Category removed successfully',
      categories: updatedCategories 
    });
    
  } catch (error) {
    console.error('❌ Error removing category:', error);
    res.status(500).json({ error: error.message });
  }
};