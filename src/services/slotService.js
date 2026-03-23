import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase/config";

// --- Utility Functions ---

/**
 * Creates slots in bulk for a given number of days starting from a specific date.
 * Slots are strictly 1 hour long.
 * @param {Date} startDate The start date explicitly
 * @param {number} days Number of days to generate slots for
 * @param {number} startHour The starting hour (e.g., 9 for 9 AM)
 * @param {number} endHour The ending hour (e.g., 18 for 6 PM)
 */
export const createSlotsBulk = async (startDate, days = 7, startHour = 9, endHour = 18) => {
  try {
    const batch = writeBatch(db);
    const slotsRef = collection(db, 'slots');
    
    // Create slots for the specified number of days
    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + dayOffset);
      
      for (let hour = startHour; hour < endHour; hour++) {
        // Create Date objects for start and end times
        const slotStart = new Date(currentDate);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(currentDate);
        slotEnd.setHours(hour + 1, 0, 0, 0);
        
        // Generate a custom ID for readability and uniqueness: YYYY-MM-DD_HH
        const dateString = slotStart.toISOString().split('T')[0];
        const hourString = hour.toString().padStart(2, '0');
        const slotId = `${dateString}_${hourString}`;
        
        const slotDocRef = doc(slotsRef, slotId);
        
        batch.set(slotDocRef, {
          startTime: Timestamp.fromDate(slotStart),
          endTime: Timestamp.fromDate(slotEnd),
          isActive: true,
          isLocked: false,
          capacity: 0,
          assignedOrders: 0,
          createdAt: serverTimestamp()
        }, { merge: true }); // Use merge to prevent overwriting existing slots entirely
      }
    }
    
    await batch.commit();
    return { success: true, message: `Successfully created slots for ${days} days.` };
  } catch (error) {
    console.error("Error creating bulk slots:", error);
    throw error;
  }
};

/**
 * Assigns a rider to a specific slot. Updates capacity.
 * @param {string} slotId 
 * @param {string} riderId 
 */
export const assignRiderToSlot = async (slotId, riderId) => {
  const slotRef = doc(db, 'slots', slotId);
  const riderRef = doc(collection(slotRef, 'riders'), riderId);

  try {
    await runTransaction(db, async (transaction) => {
      const slotDoc = await transaction.get(slotRef);
      if (!slotDoc.exists()) {
        throw new Error("Slot does not exist!");
      }

      const slotData = slotDoc.data();
      if (slotData.isLocked) {
        throw new Error("Cannot assign rider to a locked slot.");
      }

      const riderDoc = await transaction.get(riderRef);
      if (riderDoc.exists()) {
        throw new Error("Rider is already assigned to this slot.");
      }

      // Add the rider
      transaction.set(riderRef, {
        riderId: riderId,
        maxOrders: 6,
        assignedOrders: 0,
        createdAt: serverTimestamp()
      });

      // Update slot capacity (derive from +1 rider)
      transaction.update(slotRef, {
        capacity: (slotData.capacity || 0) + 6
      });
    });

    return { success: true, message: "Rider assigned successfully." };
  } catch (error) {
    console.error("Error assigning rider to slot:", error);
    throw error;
  }
};

/**
 * Removes a rider from a specific slot. Decreases capacity.
 * @param {string} slotId 
 * @param {string} riderId 
 */
export const removeRiderFromSlot = async (slotId, riderId) => {
  const slotRef = doc(db, 'slots', slotId);
  const riderRef = doc(collection(slotRef, 'riders'), riderId);

  try {
    await runTransaction(db, async (transaction) => {
      const slotDoc = await transaction.get(slotRef);
      if (!slotDoc.exists()) {
        throw new Error("Slot does not exist!");
      }

      const riderDoc = await transaction.get(riderRef);
      if (!riderDoc.exists()) {
        throw new Error("Rider is not assigned to this slot.");
      }

      const riderData = riderDoc.data();
      if (riderData.assignedOrders > 0) {
        throw new Error("Cannot remove rider because they already have assigned orders.");
      }

      // Remove the rider
      transaction.delete(riderRef);

      // Decrease slot capacity
      const slotData = slotDoc.data();
      transaction.update(slotRef, {
        capacity: Math.max(0, (slotData.capacity || 0) - 6)
      });
    });

    return { success: true, message: "Rider removed successfully." };
  } catch (error) {
    console.error("Error removing rider from slot:", error);
    throw error;
  }
};

/**
 * Locks a slot, preventing new order assignments.
 * @param {string} slotId 
 */
export const lockSlot = async (slotId) => {
  try {
    const slotRef = doc(db, 'slots', slotId);
    await updateDoc(slotRef, {
      isLocked: true
    });
    return { success: true, message: "Slot locked successfully." };
  } catch (error) {
    console.error("Error locking slot:", error);
    throw error;
  }
};

/**
 * Unlocks a slot, allowing new order assignments.
 * @param {string} slotId 
 */
export const unlockSlot = async (slotId) => {
  try {
    const slotRef = doc(db, 'slots', slotId);
    await updateDoc(slotRef, {
      isLocked: false
    });
    return { success: true, message: "Slot unlocked successfully." };
  } catch (error) {
    console.error("Error unlocking slot:", error);
    throw error;
  }
};

/**
 * Recalculates the capacity of a slot based on the number of riders assigned.
 * Useful for consistency checks.
 * @param {string} slotId 
 */
export const recalculateCapacity = async (slotId) => {
  const slotRef = doc(db, 'slots', slotId);
  const ridersRef = collection(slotRef, 'riders');

  try {
    const ridersSnapshot = await getDocs(ridersRef);
    const riderCount = ridersSnapshot.size;
    
    // Explicit 6 maxOrders per rider according to requirements
    const calculatedCapacity = riderCount * 6;

    await updateDoc(slotRef, {
      capacity: calculatedCapacity
    });

    return { success: true, newCapacity: calculatedCapacity };
  } catch (error) {
    console.error("Error recalculating capacity:", error);
    throw error;
  }
};

/**
 * Disables a slot if it shouldn't be visible on the customer side.
 * @param {string} slotId 
 */
export const toggleSlotActive = async (slotId, isActive) => {
  try {
    const slotRef = doc(db, 'slots', slotId);
    await updateDoc(slotRef, {
      isActive: isActive
    });
    return { success: true, message: `Slot active status set to ${isActive}.` };
  } catch (error) {
    console.error("Error toggling slot active status:", error);
    throw error;
  }
}

/**
 * Deletes a slot completely. Fails if orders are assigned.
 * @param {string} slotId 
 */
export const deleteSlot = async (slotId) => {
  try {
    const slotRef = doc(db, 'slots', slotId);
    const slotSnap = await getDoc(slotRef);
    
    if (!slotSnap.exists()) {
       throw new Error("Slot not found");
    }

    if (slotSnap.data().assignedOrders > 0) {
      throw new Error("Prevent deleting slot if assignedOrders > 0");
    }

    await deleteDoc(slotRef);
    return { success: true };
  } catch (error) {
    console.error("Error deleting slot:", error);
    throw error;
  }
}

// --- Queries for Dashboard ---

/**
 * Returns a query configuration for active slots.
 */
export const getActiveSlotsQuery = () => {
  return query(collection(db, 'slots'), where('isActive', '==', true));
};

/**
 * Returns a query configuration for unlocked slots.
 */
export const getUnlockedSlotsQuery = () => {
  return query(collection(db, 'slots'), where('isLocked', '==', false));
};

/**
 * Helper to get active AND unlocked slots.
 */
export const getAvailableSlotsQuery = () => {
  return query(
    collection(db, 'slots'), 
    where('isActive', '==', true),
    where('isLocked', '==', false)
  );
};

// Note: To get "slots with available capacity", Firestore cannot compare two fields directly
// (`where('assignedOrders', '<', 'capacity')` is not allowed).
// Instead, fetch available slots using `getAvailableSlotsQuery`, then filter client-side:
// const slotsWithCapacity = slots.filter(slot => slot.assignedOrders < slot.capacity);

// Slot utilization can also be calculated client-side:
// const utilizationData = slots.map(slot => ({ ...slot, utilization: slot.assignedOrders / (slot.capacity || 1) }));
