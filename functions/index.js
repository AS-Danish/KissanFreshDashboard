const {onSchedule} = require("firebase-functions/v2/scheduler");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

setGlobalOptions({region: "us-central1"});

/**
 * Scheduled function to generate slots daily at 12:00 AM
 */
exports.generateDailySlots = onSchedule({

  schedule: "0 0 * * *",
  timeZone: "Asia/Kolkata",
  retryCount: 3,
}, async (event) => {
  const db = admin.firestore();
  try {
    const ridersQuery = db.collection("riders").where("status", "==", "ACTIVE");
    const ridersSnap = await ridersQuery.get();
    const activeRiders = ridersSnap.docs.map((doc) => {
      return {id: doc.id, ...doc.data()};
    });

    const capacityPerSlot = activeRiders.length * 6;
    const batch = db.batch();

    const startHour = 9;
    const endHour = 18;

    for (let hour = startHour; hour < endHour; hour++) {
      const dateString = new Date().toISOString().split("T")[0];
      const hourString = hour.toString().padStart(2, "0");
      const slotId = `${dateString}_${hourString}`;

      const slotRef = db.collection("slots").doc(slotId);

      const slotStartStr = `${dateString}T${hourString}:00:00Z`;
      const nextHourStr = (hour + 1).toString().padStart(2, "0");
      const slotEndStr = `${dateString}T${nextHourStr}:00:00Z`;

      const slotStart = new Date(slotStartStr);
      const slotEnd = new Date(slotEndStr);

      batch.set(slotRef, {
        startTime: admin.firestore.Timestamp.fromDate(slotStart),
        endTime: admin.firestore.Timestamp.fromDate(slotEnd),
        isActive: true,
        isLocked: false,
        capacity: capacityPerSlot,
        assignedOrders: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});

      for (const rider of activeRiders) {
        const riderSlotRef = slotRef.collection("riders").doc(rider.id);
        batch.set(riderSlotRef, {
          riderId: rider.riderId || rider.id,
          maxOrders: 6,
          assignedOrders: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
      }
    }

    await batch.commit();
    console.log("Successfully generated slots.");
  } catch (error) {
    console.error("Error generating daily slots:", error);
  }
});
