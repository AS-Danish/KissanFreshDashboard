const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Set global options like region
setGlobalOptions({region: "asia-south1"});

/**
 * Assigns newly created orders to a slot and rider.
 */
exports.assignOrderToSlot = onDocumentCreated("orders/{orderId}",
    async (event) => {
      const orderId = event.params.orderId;
      const orderData = event.data.data();

      // Prevent processing pre-assigned orders
      if (orderData.slotId || orderData.riderId) {
        console.log(`Order ${orderId} already assigned. Skipping.`);
        return;
      }

      const now = admin.firestore.Timestamp.now();

      try {
        const slotsColl = db.collection("slots");
        const candidateSlotsSnap = await slotsColl
            .where("isActive", "==", true)
            .where("isLocked", "==", false)
            .where("endTime", ">", now)
            .orderBy("endTime", "asc")
            .limit(5)
            .get();

        if (candidateSlotsSnap.empty) {
          console.warn(`No active slots for order ${orderId}.`);
          await markUnassigned(orderId, "no_active_slots_available");
          return;
        }

        const candidateSlotIds = candidateSlotsSnap.docs.map((doc) => doc.id);

        await db.runTransaction(async (transaction) => {
          let selectedSlotDoc = null;
          let selectedRiderDoc = null;

          for (const slotId of candidateSlotIds) {
            const slotRef = db.collection("slots").doc(slotId);
            const slotSnap = await transaction.get(slotRef);

            if (!slotSnap.exists) continue;

            const slotCtx = slotSnap.data();
            if (!slotCtx.isActive || slotCtx.isLocked) continue;

            const cap = slotCtx.capacity || 0;
            const ass = slotCtx.assignedOrders || 0;

            if (ass >= cap) continue;

            const avRidersQuery = slotRef.collection("riders")
                .where("assignedOrders", "<", 6)
                .orderBy("assignedOrders", "asc")
                .limit(1);

            const avRidersSnap = await transaction.get(avRidersQuery);

            if (!avRidersSnap.empty) {
              selectedSlotDoc = slotSnap;
              selectedRiderDoc = avRidersSnap.docs[0];
              break;
            }
          }

          const orderRef = db.collection("orders").doc(orderId);

          if (selectedSlotDoc && selectedRiderDoc) {
            const nSlotA = (selectedSlotDoc.data().assignedOrders || 0) + 1;
            transaction.update(selectedSlotDoc.ref, {assignedOrders: nSlotA});

            const nRiderA = (selectedRiderDoc.data().assignedOrders || 0) + 1;
            transaction.update(selectedRiderDoc.ref, {assignedOrders: nRiderA});

            transaction.update(orderRef, {
              slotId: selectedSlotDoc.id,
              riderId: selectedRiderDoc.id,
              status: "assigned",
              assignedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`✅ Order ${orderId} assigned.`);
          } else {
            console.warn(`❌ Order ${orderId} failed assignment.`);
            transaction.update(orderRef, {
              status: "unassigned",
              reason: "no_slot_available",
              failedAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        });
      } catch (error) {
        console.error(`🚨 Error in assignOrderToSlot:`, error);
        await markUnassigned(orderId, "transaction_failed");
      }
    });

/**
 * Marks an order as unassigned.
 * @param {string} orderId
 * @param {string} reason
 */
async function markUnassigned(orderId, reason) {
  await db.collection("orders").doc(orderId).update({
    status: "unassigned",
    reason: reason,
  });
}


