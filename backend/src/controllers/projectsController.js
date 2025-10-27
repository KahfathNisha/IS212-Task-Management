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