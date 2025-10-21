import { db, collections } from '@/config/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

export const projectService = {
  
  /**
   * Get all projects based on user role and permissions
   * @param {string} userEmail - Current user's email
   * @param {string} userRole - User role: 'staff', 'manager', 'director', 'hr'
   * @param {string} userDepartment - User's department
   * @returns {Promise<Array>} Array of projects
   */
  async getAllProjects(userEmail, userRole, userDepartment) {
    try {
        const projectsRef = collection(db, collections.projects);
        let projects = [];
        
        if (userRole === 'director' || userRole === 'hr') {
        // Directors and HR see all projects
        const snapshot = await getDocs(projectsRef);
        projects = snapshot.docs.map(doc => this._formatProject(doc));
        
        } else if (userRole === 'manager') {
        // Managers see: their department's projects + projects they're members of
        
        // Get department projects (WITHOUT orderBy to avoid index requirement)
        const deptQuery = query(
            projectsRef, 
            where('department', '==', userDepartment || 'Unknown')
        );
        const deptSnapshot = await getDocs(deptQuery);
        const deptProjects = deptSnapshot.docs.map(doc => this._formatProject(doc));
        
        // Get projects where they're members (WITHOUT orderBy)
        const memberQuery = query(
            projectsRef,
            where('members', 'array-contains', userEmail)
        );
        const memberSnapshot = await getDocs(memberQuery);
        const memberProjects = memberSnapshot.docs.map(doc => this._formatProject(doc));
        
        // Merge and deduplicate
        const projectMap = new Map();
        [...deptProjects, ...memberProjects].forEach(p => projectMap.set(p.id, p));
        projects = Array.from(projectMap.values());
        
        } else if (userRole === 'staff') {
        // Staff see only projects they're members of (WITHOUT orderBy)
        const q = query(
            projectsRef, 
            where('members', 'array-contains', userEmail)
        );
        const snapshot = await getDocs(q);
        projects = snapshot.docs.map(doc => this._formatProject(doc));
        }
        
        // Sort in JavaScript instead of Firestore
        projects.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB - dateA; // Newest first
        });
        
        return projects;
        
    } catch (error) {
        console.error('Error fetching projects:', error);
        if (error.code === 'permission-denied') {
        throw new Error('You do not have permission to view projects');
        }
        throw new Error('Failed to load projects: ' + error.message);
    }
  },
  
  /**
   * Get a single project by ID
   * @param {string} projectId 
   * @returns {Promise<Object>} Project data
   */
  async getProject(projectId) {
    try {
      const projectRef = doc(db, collections.projects, projectId);
      const projectDoc = await getDoc(projectRef);
      
      if (!projectDoc.exists()) {
        throw new Error('Project not found');
      }
      
      return this._formatProject(projectDoc);
      
    } catch (error) {
      console.error('Error fetching project:', error);
      if (error.code === 'permission-denied') {
        throw new Error('You do not have permission to view this project');
      }
      throw error;
    }
  },
  
  /**
   * Create a new project
   * @param {Object} projectData - Project details
   * @param {string} createdBy - Creator's email
   * @param {string} creatorRole - Creator's role
   * @param {string} creatorDepartment - Creator's department
   * @returns {Promise<Object>} Created project
   */
  async createProject(projectData, createdBy, creatorRole, creatorDepartment) {
    try {
      // Validate: HR cannot create projects
      if (creatorRole === 'hr') {
        throw new Error('HR users cannot create projects');
      }
      
      const projectsRef = collection(db, collections.projects);
      
      // Prepare project data
      const newProject = {
        name: projectData.name?.trim() || '',
        description: projectData.description?.trim() || '',
        status: projectData.status || 'Ongoing',
        department: projectData.department || creatorDepartment,
        dueDate: projectData.dueDate || null,
        
        // Metadata
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Members (creator is always a member)
        members: projectData.members && projectData.members.length > 0 
          ? [...new Set([createdBy, ...projectData.members])] 
          : [createdBy],
        
        // Task tracking
        categories: projectData.categories || [],
        tasks: [],
        completedTasks: 0,
        totalTasks: 0,
        progress: 0,
        
        // Soft delete support
        isDeleted: false,
        deletedAt: null,
        deletedBy: null
      };
      
      // Validate required fields
      if (!newProject.name) {
        throw new Error('Project name is required');
      }
      
      const docRef = await addDoc(projectsRef, newProject);
      
      return {
        id: docRef.id,
        ...newProject,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error creating project:', error);
      if (error.code === 'permission-denied') {
        throw new Error('You do not have permission to create projects');
      }
      throw error;
    }
  },
  
  /**
   * Update an existing project
   * @param {string} projectId 
   * @param {Object} updates - Fields to update
   * @param {string} userRole - Current user's role
   * @param {string} userEmail - Current user's email
   * @returns {Promise<Object>} Updated project
   */
  async updateProject(projectId, updates, userRole, userEmail) {
    try {
      const projectRef = doc(db, collections.projects, projectId);
      
      // Get current project to check permissions
      const currentProject = await this.getProject(projectId);
      
      // Check if user is a member or has proper role
      const isMember = currentProject.members.includes(userEmail);
      const canEdit = userRole === 'director' || 
                      (userRole === 'manager' && isMember) ||
                      (userRole === 'staff' && isMember);
      
      if (!canEdit) {
        throw new Error('You do not have permission to edit this project');
      }
      
      // Prepare allowed updates
      const allowedUpdates = {
        updatedAt: serverTimestamp()
      };
      
      // Fields that can be updated
      const allowedFields = [
        'name', 'description', 'status', 'department', 
        'dueDate', 'categories', 'progress', 'completedTasks', 'totalTasks'
      ];
      
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          allowedUpdates[field] = updates[field];
        }
      });
      
      await updateDoc(projectRef, allowedUpdates);
      
      return await this.getProject(projectId);
      
    } catch (error) {
      console.error('Error updating project:', error);
      if (error.code === 'permission-denied') {
        throw new Error('You do not have permission to update this project');
      }
      throw error;
    }
  },
  
  /**
   * Delete a project (only creator can delete)
   * @param {string} projectId 
   * @param {string} userEmail - Current user's email
   * @returns {Promise<void>}
   */
  async deleteProject(projectId, userEmail) {
    try {
      const project = await this.getProject(projectId);
      
      // Only creator can delete
      if (project.createdBy !== userEmail) {
        throw new Error('Only the project creator can delete this project');
      }
      
      const projectRef = doc(db, collections.projects, projectId);
      await deleteDoc(projectRef);
      
    } catch (error) {
      console.error('Error deleting project:', error);
      if (error.code === 'permission-denied') {
        throw new Error('You do not have permission to delete this project');
      }
      throw error;
    }
  },
  
  /**
   * Soft delete a project (mark as deleted)
   * @param {string} projectId 
   * @param {string} userEmail 
   * @returns {Promise<Object>}
   */
  async softDeleteProject(projectId, userEmail) {
    try {
      const projectRef = doc(db, collections.projects, projectId);
      
      await updateDoc(projectRef, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: userEmail,
        updatedAt: serverTimestamp()
      });
      
      return await this.getProject(projectId);
      
    } catch (error) {
      console.error('Error soft deleting project:', error);
      throw error;
    }
  },
  
  /**
   * Restore a soft-deleted project
   * @param {string} projectId 
   * @returns {Promise<Object>}
   */
  async restoreProject(projectId) {
    try {
      const projectRef = doc(db, collections.projects, projectId);
      
      await updateDoc(projectRef, {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        updatedAt: serverTimestamp()
      });
      
      return await this.getProject(projectId);
      
    } catch (error) {
      console.error('Error restoring project:', error);
      throw error;
    }
  },
  
  /**
   * Add a member to a project
   * @param {string} projectId 
   * @param {string} memberEmail 
   * @returns {Promise<Object>}
   */
  async addMember(projectId, memberEmail) {
    try {
      const projectRef = doc(db, collections.projects, projectId);
      
      await updateDoc(projectRef, {
        members: arrayUnion(memberEmail),
        updatedAt: serverTimestamp()
      });
      
      return await this.getProject(projectId);
      
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  },
  
  /**
   * Remove a member from a project
   * @param {string} projectId 
   * @param {string} memberEmail 
   * @returns {Promise<Object>}
   */
  async removeMember(projectId, memberEmail) {
    try {
      const project = await this.getProject(projectId);
      
      // Cannot remove the creator
      if (project.createdBy === memberEmail) {
        throw new Error('Cannot remove the project creator');
      }
      
      const projectRef = doc(db, collections.projects, projectId);
      
      await updateDoc(projectRef, {
        members: arrayRemove(memberEmail),
        updatedAt: serverTimestamp()
      });
      
      return await this.getProject(projectId);
      
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  },
  
  /**
   * Add a category to a project
   * @param {string} projectId 
   * @param {string} category 
   * @returns {Promise<Object>}
   */
  async addCategory(projectId, category) {
    try {
      const projectRef = doc(db, collections.projects, projectId);
      
      await updateDoc(projectRef, {
        categories: arrayUnion(category),
        updatedAt: serverTimestamp()
      });
      
      return await this.getProject(projectId);
      
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  },
  
  /**
   * Remove a category from a project
   * @param {string} projectId 
   * @param {string} category 
   * @returns {Promise<Object>}
   */
  async removeCategory(projectId, category) {
    try {
      const projectRef = doc(db, collections.projects, projectId);
      
      await updateDoc(projectRef, {
        categories: arrayRemove(category),
        updatedAt: serverTimestamp()
      });
      
      return await this.getProject(projectId);
      
    } catch (error) {
      console.error('Error removing category:', error);
      throw error;
    }
  },
  
  /**
   * Get projects by department
   * @param {string} department 
   * @returns {Promise<Array>}
   */
  async getProjectsByDepartment(department) {
    try {
      const projectsRef = collection(db, collections.projects);
      const q = query(
        projectsRef,
        where('department', '==', department),
        where('isDeleted', '==', false),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => this._formatProject(doc));
      
    } catch (error) {
      console.error('Error fetching projects by department:', error);
      throw error;
    }
  },
  
  /**
   * Get projects by category
   * @param {string} category 
   * @returns {Promise<Array>}
   */
  async getProjectsByCategory(category) {
    try {
      const projectsRef = collection(db, collections.projects);
      const q = query(
        projectsRef,
        where('categories', 'array-contains', category),
        where('isDeleted', '==', false),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => this._formatProject(doc));
      
    } catch (error) {
      console.error('Error fetching projects by category:', error);
      throw error;
    }
  },
  
  /**
   * Format project document data
   * @private
   * @param {DocumentSnapshot} doc 
   * @returns {Object}
   */
  _formatProject(doc) {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      // Convert Firestore timestamps to JavaScript Date objects
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
      deletedAt: data.deletedAt?.toDate?.() || null,
      dueDate: data.dueDate || null
    };
  }
};