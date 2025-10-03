/**
 * This service handles IN-APP notifications by listening directly to Firestore changes.
 * This method works on the free "Spark" plan and does not require Cloud Functions.
 */
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
// --- THIS IS THE KEY CHANGE ---
// We now import our new Pinia store to show visual notifications.
import { useNotificationStore } from "@/stores/notificationStore";

let taskListener = null;
const localTaskCache = new Map();

/**
 * Initializes the real-time listener for the current user's tasks.
 * @param {string} userId - The email/ID of the logged-in user.
 */
export async function initializeTaskListeners(userId) {
  if (!userId) {
    console.error("Cannot initialize task listeners without a userId.");
    return;
  }

  if (taskListener) {
    taskListener(); // Unsubscribe from any previous listener
  }
  
  // Fetch user's notification settings once.
  const userSettingsDoc = await getDoc(doc(db, "users", userId));
  const userSettings = userSettingsDoc.data()?.notificationSettings || {};

  const q = query(collection(db, "tasks"), where("assignedTo", "array-contains", userId));

  console.log(`[NotificationService] Initializing task listener for user: ${userId}`);

  taskListener = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const newDocData = change.doc.data();
      const taskId = change.doc.id;
      const oldDocData = localTaskCache.get(taskId);

      // --- Handle Task Updates and Reassignments ---
      if (change.type === "modified" && oldDocData) {
        // Priority Change
        if (oldDocData.priority !== newDocData.priority && userSettings.TASK_UPDATE !== false) {
          showInAppNotification(
            `Priority Updated: ${newDocData.title}`,
            `${newDocData.lastUpdatedBy || 'A manager'} changed priority to "${newDocData.priority}".`
          );
        }
        // Status Change
        if (oldDocData.status !== newDocData.status && userSettings.TASK_UPDATE !== false) {
          showInAppNotification(
            `Status Updated: ${newDocData.title}`,
            `${newDocData.lastUpdatedBy || 'A manager'} changed status to "${newDocData.status}".`
          );
        }
        // --- ADDED: Description Change ---
        if (oldDocData.description !== newDocData.description && userSettings.TASK_UPDATE !== false) {
          showInAppNotification(
            `Description Updated: ${newDocData.title}`,
            `${newDocData.lastUpdatedBy || 'A manager'} updated the task description.`
          );
        }

        const oldAssignees = new Set(oldDocData.assignedTo || []);
        const newAssignees = new Set(newDocData.assignedTo || []);
        
        // Check if the current user was just added
        if (!oldAssignees.has(userId) && newAssignees.has(userId) && userSettings.TASK_REASSIGNMENT_ADD !== false) {
          showInAppNotification(
            `You've been assigned a task: ${newDocData.title}`,
            `${newDocData.lastUpdatedBy || 'A manager'} assigned this task to you.`
          );
        }
      }
      
      // --- ADDED: Handle being REMOVED from a task ---
      if (change.type === "removed" && userSettings.TASK_REASSIGNMENT_REMOVE !== false) {
         showInAppNotification(
            `You've been removed from a task: ${oldDocData.title}`,
            `${newDocData.lastUpdatedBy || 'A manager'} removed you from this task.`
          );
      }

      // --- Handle a brand new task being created ---
      if (change.type === "added" && !localTaskCache.has(taskId) && userSettings.TASK_REASSIGNMENT_ADD !== false) {
        showInAppNotification(
          `New Task Assigned: ${newDocData.title}`,
          `A new task has been assigned to you. Due: ${newDocData.dueDate.toDate().toLocaleDateString()}`
        );
      }
      
      if(change.type !== "removed") {
        localTaskCache.set(taskId, newDocData);
      } else {
        localTaskCache.delete(taskId);
      }
    });
  });
}

/**
 * Detaches the Firestore listener to prevent memory leaks on logout.
 */
export function cleanupTaskListeners() {
  if (taskListener) {
    console.log("[NotificationService] Cleaning up task listener.");
    taskListener(); // Unsubscribe
    taskListener = null;
    localTaskCache.clear();
  }
}

/**
 * Triggers a visual notification by adding it to the Pinia store.
 * @param {string} title - The title of the notification.
 * @param {string} body - The main content of the notification.
 */
function showInAppNotification(title, body) {
  const notificationStore = useNotificationStore();
  notificationStore.addNotification({ title, body });
}

