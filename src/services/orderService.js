import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Assigns or re-assigns an order to a specific slot and rider.
 * Uses a transaction to prevent race conditions on capacity.
 *
 * @param {string} orderId 
 * @param {string} newSlotId 
 * @param {string} newRiderId 
 * @param {string} oldSlotId (Optional) Current assigned slot 
 * @param {string} oldRiderId (Optional) Current assigned rider 
 */
export const assignRiderToOrderTransaction = async (
  orderId,
  newSlotId,
  newRiderId,
  oldSlotId = null,
  oldRiderId = null
) => {
  try {
    const orderRef = doc(db, "orders", orderId);
    const newSlotRef = doc(db, "slots", newSlotId);
    const newRiderRef = doc(db, `slots/${newSlotId}/riders/${newRiderId}`);

    let oldSlotRef = null;
    let oldRiderRef = null;

    if (oldSlotId && oldSlotId !== newSlotId) {
      oldSlotRef = doc(db, "slots", oldSlotId);
    }
    if (oldSlotId && oldRiderId && (oldSlotId !== newSlotId || oldRiderId !== newRiderId)) {
      oldRiderRef = doc(db, `slots/${oldSlotId}/riders/${oldRiderId}`);
    }

    await runTransaction(db, async (transaction) => {
      // 1. Fetch current order
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists()) {
        throw new Error("Order does not exist!");
      }

      // 2. Fetch new slot
      const newSlotDoc = await transaction.get(newSlotRef);
      if (!newSlotDoc.exists()) {
        throw new Error("The target slot does not exist.");
      }

      // 3. Fetch new rider configuration in this slot
      const newRiderDoc = await transaction.get(newRiderRef);
      if (!newRiderDoc.exists()) {
        throw new Error("The selected rider is not assigned to the target slot.");
      }

      const newRiderData = newRiderDoc.data();
      const newSlotData = newSlotDoc.data();

      if (newSlotData.isLocked || !newSlotData.isActive) {
        throw new Error("The target slot is unavailable or locked.");
      }

      if ((newRiderData.assignedOrders || 0) >= (newRiderData.maxOrders || 6)) {
        throw new Error("The selected rider has reached their maximum capacity for this slot.");
      }

      // 4. Handle de-allocation from old slots if they exist and are different
      if (oldSlotRef) {
        const oldSlotDoc = await transaction.get(oldSlotRef);
        if (oldSlotDoc.exists()) {
          const decrementedAssigned = Math.max(0, (oldSlotDoc.data().assignedOrders || 0) - 1);
          transaction.update(oldSlotRef, { assignedOrders: decrementedAssigned });
        }
      }

      if (oldRiderRef) {
        const oldRiderDoc = await transaction.get(oldRiderRef);
        if (oldRiderDoc.exists()) {
          const decrementedRiderAssigned = Math.max(0, (oldRiderDoc.data().assignedOrders || 0) - 1);
          transaction.update(oldRiderRef, { assignedOrders: decrementedRiderAssigned });
        }
      } else if (oldSlotId === newSlotId && oldRiderId && oldRiderId !== newRiderId) {
        // If the slot is the same but the rider changed
        const oldSameSlotRiderRef = doc(db, `slots/${newSlotId}/riders/${oldRiderId}`);
        const oldSameSlotRiderDoc = await transaction.get(oldSameSlotRiderRef);
        if (oldSameSlotRiderDoc.exists()) {
          const decrementedRiderAssigned = Math.max(0, (oldSameSlotRiderDoc.data().assignedOrders || 0) - 1);
          transaction.update(oldSameSlotRiderRef, { assignedOrders: decrementedRiderAssigned });
        }
      }

      // 5. Update new allocations
      // Only increment slot if we are changing slots
      if (!oldSlotId || oldSlotId !== newSlotId) {
        transaction.update(newSlotRef, { assignedOrders: (newSlotData.assignedOrders || 0) + 1 });
      }
      
      transaction.update(newRiderRef, { assignedOrders: (newRiderData.assignedOrders || 0) + 1 });

      // 6. Update Order Document
      transaction.update(orderRef, {
        slotId: newSlotId,
        riderId: newRiderId,
        status: "PROCESSING", // Automatically transition if assigned
        updatedAt: new Date().toISOString()
      });
    });

    return { success: true, message: "Order successfully assigned." };
  } catch (error) {
    console.error("Assignment Transaction Failed:", error);
    throw error;
  }
};
