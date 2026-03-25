const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

// Set global options to use Node 20 and specific region
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

/**
 * Triggered when a new document is added to the 'failed_orders' collection.
 * This function automatically issues a refund using the Razorpay API.
 */
exports.processimmediaterefund = onDocumentCreated({
  document: "failed_orders/{docId}",
  secrets: ["RAZORPAY_KEY", "RAZORPAY_SECRET"],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No data associated with the event");
    return null;
  }

  const data = snapshot.data();
  const docId = event.params.docId;

  // Only attempt refund if status is 'paid_but_stock_failed'
  // and not already refunded
  if (data.status !== "paid_but_stock_failed" ||
      data.refundStatus === "processed") {
    console.log(`Document ${docId} skipped: Status is ${data.status}, ` +
                `RefundStatus is ${data.refundStatus}`);
    return null;
  }

  const {paymentId, totalAmount} = data;

  if (!paymentId) {
    console.error(`Document ${docId} missing paymentId. ` +
                  `Cannot process refund.`);
    return snapshot.ref.update({
      refundStatus: "failed",
      refundError: "Missing paymentId",
    });
  }

  // Initialize Razorpay with keys from secret manager
  const rKey = process.env.RAZORPAY_KEY;
  const rSecret = process.env.RAZORPAY_SECRET;

  if (!rKey || !rSecret) {
    console.error("Razorpay keys not configured in Firebase Secrets " +
                  "or not linked to the function.");
    return snapshot.ref.update({
      refundStatus: "failed",
      refundError: "Razorpay keys not configured in Secrets",
    });
  }

  const Razorpay = require("razorpay");
  const razorpay = new Razorpay({
    key_id: rKey,
    key_secret: rSecret,
  });

  try {
    console.log(`Checking status for Payment ID: ${paymentId}`);

    const payment = await razorpay.payments.fetch(paymentId);
    console.log(`Current Payment Status: ${payment.status}`);

    if (payment.status === "authorized") {
      console.log(`Payment ${paymentId} is authorized. Capturing now...`);
      const captureResponse = await razorpay.payments.capture(paymentId,
          Math.round(totalAmount * 100), "INR");
      console.log(`Capture successful: ${captureResponse.id}. ` +
                  `Waiting 2s for sync...`);
      // Add a small delay for Razorpay systems to sync the state
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } else if (payment.status !== "captured") {
      return snapshot.ref.update({
        refundStatus: "failed",
        refundError: `Payment is in ${payment.status} state. ` +
                     "Only 'captured' or 'authorized' can be processed.",
        refundErrorCode: "PAYMENT_NOT_READY",
      });
    }

    console.log(`Initiating full refund for ${paymentId}`);

    // Omitting amount per Razorpay docs to perform a full refund
    const refund = await razorpay.payments.refund(paymentId, {
      notes: {
        reason: "Auto-refund due to stock race condition",
        failed_order_doc_id: docId,
      },
    });

    console.log(`Refund successful for ${docId}:`, refund.id);

    return snapshot.ref.update({
      refundStatus: "processed",
      refundId: refund.id,
      refundTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Refund failed for ${docId}:`, error);

    // Razorpay error objects often have a nested 'error' property
    const rzpErr = error.error || error;
    const errorMsg = rzpErr.description || rzpErr.message ||
                     (typeof error === "string" ? error : "Unknown error");
    const errorCode = rzpErr.code || "unknown_refund_error";

    return snapshot.ref.update({
      refundStatus: "failed",
      refundError: errorMsg,
      refundErrorCode: errorCode,
      refundTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});

/**
 * Callable function to process order creation and slot/rider assignment
 * natively inside a transaction.
 */
exports.createOrder = onCall(async (request) => {
  const data = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated",
        "User must be logged in to place an order.");
  }

  const orderData = data.order;
  if (!orderData || !orderData.items || orderData.items.length === 0) {
    throw new HttpsError("invalid-argument", "Missing order items.");
  }

  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  try {
    // 1. Fetch candidate slots outside transaction
    const candidateSlotsSnap = await db.collection("slots")
        .where("isActive", "==", true)
        .where("isLocked", "==", false)
        .where("endTime", ">", now)
        .orderBy("endTime", "asc")
        .limit(5)
        .get();

    if (candidateSlotsSnap.empty) {
      throw new HttpsError("failed-precondition",
          "Currently no slots are available. Please try again later.",
          {reason: "no_slots_available"});
    }

    const candidateSlotIds = candidateSlotsSnap.docs.map((doc) => doc.id);

    // 2. Perform Transaction
    const result = await db.runTransaction(async (transaction) => {
      // a. Check all products to verify stock availability
      const productRefs = orderData.items.map((item) =>
        db.collection("products").doc(item.productId));
      const productSnaps = await transaction.getAll(...productRefs);
      const stockUpdates = [];

      for (let i = 0; i < productSnaps.length; i++) {
        const snap = productSnaps[i];
        const item = orderData.items[i];

        if (!snap.exists) {
          throw new HttpsError("failed-precondition",
              `Product ${item.title} no longer available.`,
              {reason: "product_unavailable"});
        }

        const currentStock = snap.data().stockCount || 0;
        if (currentStock < item.quantity) {
          throw new HttpsError("failed-precondition",
              `Insufficient stock for ${item.title}. ` +
              `Available: ${currentStock}`,
              {reason: "insufficient_stock"});
        }

        stockUpdates.push({
          ref: snap.ref,
          newStock: currentStock - item.quantity,
        });
      }

      // b. Verify candidate slots and look for one with capacity and rider
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

        // Valid slot found. Look for an available rider
        const avRidersQuery = slotRef.collection("riders")
            .where("assignedOrders", "<", 6)
            .orderBy("assignedOrders", "asc")
            .limit(1);

        const ridersSnap = await transaction.get(avRidersQuery);

        if (!ridersSnap.empty) {
          selectedSlotDoc = slotSnap;
          selectedRiderDoc = ridersSnap.docs[0];
          break; // Stop looking once we found both
        }
      }

      if (!selectedSlotDoc || !selectedRiderDoc) {
        throw new HttpsError("failed-precondition",
            "No active slots are currently available for delivery. " +
            "They might be fully booked.",
            {reason: "no_slots_available"});
      }

      // c. Write operations
      // Deduct stock levels
      for (const update of stockUpdates) {
        transaction.update(update.ref, {stockCount: update.newStock});
      }

      // Update Slot
      const newSlotAssignedOrders =
          (selectedSlotDoc.data().assignedOrders || 0) + 1;
      transaction.update(selectedSlotDoc.ref,
          {assignedOrders: newSlotAssignedOrders});

      // Update Rider
      const newRiderAssignedOrders =
          (selectedRiderDoc.data().assignedOrders || 0) + 1;
      transaction.update(selectedRiderDoc.ref,
          {assignedOrders: newRiderAssignedOrders});

      // Create final order Document natively including assigned states
      const orderRef = db.collection("orders").doc(orderData.id);
      const enrichedOrderData = {
        ...orderData,
        slotId: selectedSlotDoc.id,
        riderId: selectedRiderDoc.id,
        status: "assigned",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      transaction.set(orderRef, enrichedOrderData);

      return enrichedOrderData;
    });

    console.log(`✅ Order ${orderData.id} successfully created and ` +
                `assigned to Slot: ${result.slotId}, ` +
                `Rider: ${result.riderId}`);
    return {
      success: true,
      message: "Order processed successfully",
      orderId: orderData.id,
      slotId: result.slotId,
      riderId: result.riderId,
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error(`🚨 Error creating order ${orderData.id}:`, error);
    throw new HttpsError("internal",
        "An unexpected error occurred while placing your order.",
        error.message);
  }
});
