const { db } = require('../config/firebase');

/**
 * Helper function to check if a department is HR-related (should be filtered out)
 */
const isHRDepartment = (dept) => {
  if (!dept || typeof dept !== 'string') return false;
  const deptUpper = dept.toUpperCase().trim();
  // Match common HR department names: "HR", "HR and Admin", "Human Resources", etc.
  return deptUpper === 'HR' || 
         deptUpper === 'H R' ||
         deptUpper.startsWith('HR ') || 
         deptUpper.includes(' HR ') ||
         deptUpper.endsWith(' HR') ||
         deptUpper === 'HUMAN RESOURCES' ||
         deptUpper === 'HR AND ADMIN' ||
         deptUpper === 'HR & ADMIN' ||
         deptUpper === 'HRADMIN';
};

/**
 * Get all departments
 * Returns departments from the departments collection, or falls back to unique departments from Users
 * Excludes HR-related departments (HR is admin/support, not operational)
 */
exports.getAllDepartments = async (req, res) => {
  try {
    if (!req.user) {
      console.error('❌ [getAllDepartments] req.user is missing!');
      return res.status(401).json({ success: false, message: 'Unauthorized: User not authenticated' });
    }
    
    // Normalize role - handle various cases
    let requesterRole = req.user?.role;
    if (typeof requesterRole === 'string') {
      requesterRole = requesterRole.toLowerCase().trim();
    } else {
      requesterRole = '';
    }
    
    // Helper function to extract departments from Users
    const extractDepartmentsFromUsers = async () => {
      const usersSnapshot = await db.collection('Users').get();
      const departmentSet = new Set();
      
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        const userDept = userData.department;
        
        // Include all departments, but exclude 'ALL' and HR departments
        if (userDept && typeof userDept === 'string') {
          const trimmed = userDept.trim();
          if (trimmed !== '' && 
              trimmed.toUpperCase() !== 'ALL' && 
              trimmed.toUpperCase() !== 'ALL DEPARTMENTS' &&
              !isHRDepartment(trimmed)) {
            departmentSet.add(trimmed);
          }
        }
      });
      
      const foundDepts = Array.from(departmentSet);
      
      // Log warning only if no valid departments found
      if (foundDepts.length === 0 || (foundDepts.length === 1 && foundDepts[0].toUpperCase() === 'ALL')) {
        console.warn('⚠️ [getAllDepartments] Only found "ALL" or no departments! This may indicate a data issue.');
      }
      
      return foundDepts.sort().map(dept => ({ id: dept, name: dept }));
    };
    
    // For HR and Directors: Always extract from Users to get all departments across the company
    // This ensures they see all departments regardless of department collection state
    const isHRorDirector = requesterRole === 'hr' || requesterRole === 'director';
    
    if (isHRorDirector) {
      const departments = await extractDepartmentsFromUsers();
      return res.status(200).json(departments);
    }
    
    // Safety check: If somehow we got here with HR/Director role, force Users extraction
    // This should never happen if the check above worked, but adding as defensive programming
    if (requesterRole === 'hr' || requesterRole === 'director') {
      console.error('⚠️ [getAllDepartments] ERROR: HR/Director should have been handled above! This is unexpected.');
      const departments = await extractDepartmentsFromUsers();
      return res.status(200).json(departments);
    }
    
    // First try to get from departments collection
    const departmentsSnapshot = await db.collection('departments').get();
    
    if (!departmentsSnapshot.empty) {
      // Check if departments have proper name fields, or if they're just document IDs
      // NOTE: The departments collection might have wrong data (projects, etc.) - prioritize name fields
      const departments = departmentsSnapshot.docs
        .filter(doc => {
          const data = doc.data();
          // Skip documents that look like projects (have members array) - these shouldn't be in departments collection
          if (data.members && Array.isArray(data.members)) {
            return false;
          }
          return true;
        })
        .map(doc => {
          const data = doc.data();
        
        // Try multiple possible field names for department name
        // Prioritize title/label over name if name looks like Firestore ID
        const nameField = data.name;
        const isNameFirestoreId = nameField && nameField.length > 15 && /^[a-zA-Z0-9]+$/.test(nameField);
        
        let name;
        if (isNameFirestoreId) {
          // If name is Firestore ID, prefer other fields
          name = data.title || data.label || data.departmentName || nameField;
        } else {
          // Normal priority
          name = data.name || data.departmentName || data.title || data.label;
        }
        
        // If no name field found, the document might just be a placeholder
        // We'll check if the ID looks like a Firestore auto-generated ID (20 chars alphanumeric)
        const isAutoGeneratedId = doc.id.length >= 20 && /^[a-zA-Z0-9]+$/.test(doc.id);
        
        // If ID looks auto-generated and no name field, skip this document and use Users fallback
        if (isAutoGeneratedId && !name) {
          return null;
        }
        
        return {
          id: doc.id,
          name: name || doc.id, // Use ID as fallback only if it's not auto-generated
          ...data
        };
      })
      .filter(Boolean) // Remove null entries
      .filter(dept => !isHRDepartment(dept.name || dept.id)); // Filter out HR departments
      
      // If we filtered out all departments (because they all had auto-generated IDs without names or were projects),
      // fall through to Users extraction
      if (departments.length === 0) {
        // Fall through to Users extraction
      } else {
        // Sort alphabetically
        departments.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        return res.status(200).json(departments);
      }
    }
    
    // Fallback: extract unique departments from Users (for managers/staff or when departments collection is empty)
    const departments = await extractDepartmentsFromUsers();
    return res.status(200).json(departments);
  } catch (error) {
    console.error('❌ [getAllDepartments] Error fetching departments:', error);
    res.status(500).json({ success: false, message: 'An internal server error occurred.', error: error.message });
  }
};

