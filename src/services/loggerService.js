import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase/config";

const LOGS_COLLECTION = "audit_logs";

/**
 * Logs an administrative action to the audit_logs collection.
 * 
 * @param {string} action - The action performed (e.g., 'PRODUCT_ADDED', 'ORDER_STATUS_CHANGED').
 * @param {string} entityType - The type of entity affected (e.g., 'PRODUCT', 'ORDER', 'CATEGORY').
 * @param {string} entityId - The ID of the entity affected.
 * @param {object} details - Any additional details about the action (e.g., changes made, new values).
 */
export const logAdminAction = async (action, entityType, entityId, details = {}) => {
  try {
    const user = auth.currentUser;
    const logData = {
      action,
      entityType,
      entityId,
      details,
      userEmail: user?.email || "unknown",
      userId: user?.uid || "unknown",
      timestamp: serverTimestamp(),
    };
    
    await addDoc(collection(db, LOGS_COLLECTION), logData);
  } catch (error) {
    console.error("Failed to log admin action:", error);
    // We don't want to break the main flow if logging fails, so we just catch and log it.
  }
};

import { query, orderBy, getDocs, limit, startAfter } from "firebase/firestore";

export const getAuditLogs = async (pageSize = 20, lastDoc = null) => {
  try {
    const logsRef = collection(db, LOGS_COLLECTION);
    let qConstraints = [orderBy("timestamp", "desc"), limit(pageSize)];
    
    if (lastDoc) {
      qConstraints.push(startAfter(lastDoc));
    }
    
    const q = query(logsRef, ...qConstraints);
    const snap = await getDocs(q);
    
    const logs = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return {
      logs,
      lastVisible: snap.docs[snap.docs.length - 1],
      hasMore: snap.docs.length === pageSize
    };
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    throw error;
  }
};
