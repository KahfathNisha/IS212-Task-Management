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
    const { name, description, status, department: projectDept, dueDate, owners } = req.body;
    
    // RBAC: Only director, manager, and staff can create projects
    if (role !== 'director' && role !== 'manager' && role !== 'staff') {
      return res.status(403).json({ message: 'Insufficient permissions to create projects' });
    }
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Project name is required' });
    }
    
    // Manager can only create projects in their department
    let finalDepartment = projectDept || department;
    if (role === 'manager' && projectDept && projectDept !== department) {
      return res.status(403).json({ message: 'Insufficient permissions: You can only create projects in your department' });
    }
    
    const projectData = {
      name: name.trim(),
      description: description || '',
      status: status || 'Ongoing',
      department: finalDepartment,
      dueDate: dueDate || null,
      members: [email],
      createdBy: email,
      owners: owners || [email],
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
    const { name, description, status, department, dueDate, owners } = req.body;
    const { email, role, department: userDept } = req.user;
    
    const projectRef = db.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const projectData = projectDoc.data();
    
    // RBAC: Only director, manager, and staff can update projects
    if (role !== 'director' && role !== 'manager' && role !== 'staff') {
      return res.status(403).json({ message: 'Insufficient permissions to update projects' });
    }
    
    // Manager can only update projects in their department
    if (role === 'manager' && projectData.department !== userDept) {
      return res.status(403).json({ message: 'Insufficient permissions: You can only update projects in your department' });
    }
    
    // Prevent managers from changing department
    if (role === 'manager' && department !== undefined && department !== projectData.department) {
      return res.status(403).json({ message: 'Insufficient permissions: Managers cannot change project department' });
    }
    
    const updateData = {
      updatedAt: new Date()
    };
    
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (department !== undefined) updateData.department = department;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (owners !== undefined) updateData.owners = owners;
    // categories are no longer stored on projects
    
    await projectRef.update(updateData);
    
    console.log('✅ Updated project:', projectId);
    res.status(200).json({ 
      id: projectId,
      ...projectData,
      ...updateData
    });
    
  } catch (error) {
    console.error('❌ Error updating project:', error);
    res.status(500).json({ error: error.message });
  }
};

// Project-level category management removed. Categories are task-level only.