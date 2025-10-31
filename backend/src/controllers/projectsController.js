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

// Create project
exports.createProject = async (req, res) => {
  try {
    const { email, role, department } = req.user;
    const { name, description, status, department: projectDept, dueDate } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Project name is required' });
    }
    
    const projectData = {
      name: name.trim(),
      description: description || '',
      status: status || 'Ongoing',
      department: projectDept || department,
      dueDate: dueDate || null,
      members: [email],
      createdBy: email,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      totalTasks: 0,
      completedTasks: 0,
      progress: 0
    };
    
    const projectRef = await db.collection('projects').add(projectData);
    
    console.log('✅ Created project:', projectRef.id);
    res.status(201).json({ 
      id: projectRef.id,
      ...projectData 
    });
    
  } catch (error) {
    console.error('❌ Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update project
exports.updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const { name, description, status, department, dueDate } = req.body;
    
    const projectRef = db.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const updateData = {
      updatedAt: new Date()
    };
    
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (department !== undefined) updateData.department = department;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    // categories are no longer stored on projects
    
    await projectRef.update(updateData);
    
    console.log('✅ Updated project:', projectId);
    res.status(200).json({ 
      id: projectId,
      ...projectDoc.data(),
      ...updateData
    });
    
  } catch (error) {
    console.error('❌ Error updating project:', error);
    res.status(500).json({ error: error.message });
  }
};

// Project-level category management removed. Categories are task-level only.