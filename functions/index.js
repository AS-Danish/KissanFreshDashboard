const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({ region: "us-central1" });

/**
 * Haversine formula to calculate distance between two points in km.
 * @param {number} lat1 Latitude of point 1.
 * @param {number} lon1 Longitude of point 1.
 * @param {number} lat2 Latitude of point 2.
 * @param {number} lon2 Longitude of point 2.
 * @return {number} Distance in km.
 */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


exports.generateDailySlots = require("firebase-functions/v2/scheduler")
  .onSchedule({
    schedule: "0 0 * * *",
    timeZone: "Asia/Kolkata",
    retryCount: 3,
  }, async (event) => {
    try {
      const ridersQuery = db.collection("riders")
        .where("status", "==", "ACTIVE");
      const ridersSnap = await ridersQuery.get();
      const activeRiders = ridersSnap.docs.map((doc) => {
        return { id: doc.id, ...doc.data() };
      });

      const capacityPerSlot = activeRiders.length * 6;
      const batch = db.batch();

      const startHour = 6;
      const endHour = 22;

      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
        const targetDate = new Date();
        const dayMs = dayOffset * 24 * 60 * 60 * 1000;
        targetDate.setTime(targetDate.getTime() + dayMs);
        const dateString = formatter.format(targetDate);

        // Check if slots for this date exist (e.g., from today's slot)
        const firstSlotId =
          `${dateString}_${startHour.toString().padStart(2, "0")}`;
        const firstSlotSnap =
          await db.collection("slots").doc(firstSlotId).get();
        if (firstSlotSnap.exists) {
          console.log(`Slots for ${dateString} already exist. Skipping.`);
          continue;
        }

        console.log(`Generating slots for date: ${dateString}`);

        for (let hour = startHour; hour < endHour; hour++) {
          const hourString = hour.toString().padStart(2, "0");
          const slotId = `${dateString}_${hourString}`;

          const slotRef = db.collection("slots").doc(slotId);

          const slotStartStr = `${dateString}T${hourString}:00:00+05:30`;
          const nextHourStr = (hour + 1).toString().padStart(2, "0");
          const slotEndStr = `${dateString}T${nextHourStr}:00:00+05:30`;

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
          }, { merge: true });

          for (const rider of activeRiders) {
            const riderSlotRef = slotRef.collection("riders").doc(rider.id);
            batch.set(riderSlotRef, {
              riderId: rider.riderId || rider.id,
              maxOrders: 6,
              assignedOrders: 0,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          }
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
exports.processimmediaterefund = require("firebase-functions/v2/firestore")
  .onDocumentCreated({
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

    if (data.status !== "paid_but_stock_failed" ||
      data.refundStatus === "processed") {
      console.log(`Document ${docId} skipped: Status is ${data.status}, ` +
        `RefundStatus is ${data.refundStatus}`);
      return null;
    }

    const { paymentId, totalAmount } = data;

    if (!paymentId) {
      console.error(`Document ${docId} missing paymentId. ` +
        `Cannot process refund.`);
      return snapshot.ref.update({
        refundStatus: "failed",
        refundError: "Missing paymentId",
      });
    }

    const rKey = process.env.RAZORPAY_KEY;
    const rSecret = process.env.RAZORPAY_SECRET;

    if (!rKey || !rSecret) {
      console.error("Razorpay keys not configured in Firebase Secrets.");
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
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else if (payment.status !== "captured") {
        return snapshot.ref.update({
          refundStatus: "failed",
          refundError: `Payment is in ${payment.status} state.`,
          refundErrorCode: "PAYMENT_NOT_READY",
        });
      }

      console.log(`Initiating full refund for ${paymentId}`);

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
 * Callable function to process order creation and specific slot/rider
 * assignment natively inside a transaction.
 */
exports.createOrder = require("firebase-functions/v2/https")
  .onCall(
    async (request) => {
      const data = request.data;
      const auth = request.auth;
      const { HttpsError } = require("firebase-functions/v2/https");
      const orderData = data.order;

      // 1. Service Area Restriction Check (30km Radius)
      const cityCenter = { lat: 19.8762, lng: 75.3433 };
      if (orderData.latitude && orderData.longitude) {
        const distance = getDistance(
          orderData.latitude,
          orderData.longitude,
          cityCenter.lat,
          cityCenter.lng,
        );

        if (distance > 30) {
          throw new HttpsError("failed-precondition",
            "We are not in your area yet. Currently, we only serve " +
            "Chattrapati Sambhaji Nagar.",
            { reason: "out_of_service_area", distance: distance });
        }
      }
      // ... rest of your existing transaction logic ...

      if (!auth) {
        throw new HttpsError("unauthenticated",
          "User must be logged in to place an order.");
      }

      if (!orderData || !orderData.items || orderData.items.length === 0) {
        throw new HttpsError("invalid-argument", "Missing order items.");
      }

      const selectedSlotId = orderData.slotId;
      if (!selectedSlotId) {
        throw new HttpsError("invalid-argument",
          "Missing preferred slot ID for delivery.");
      }

      try {
        const result = await db.runTransaction(async (transaction) => {
          const userRef = db.collection("users").doc(auth.uid);
          const userSnap = await transaction.get(userRef);
          const customerName = userSnap.exists ? (userSnap.data()?.name || userSnap.data()?.displayName || "Guest") : "Guest";

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
                { reason: "product_unavailable" });
            }

            const quantity = parseInt(item.quantity, 10);
            if (isNaN(quantity) || quantity < 1) {
              throw new HttpsError("invalid-argument",
                `Invalid quantity for ${item.title}.`,
                { reason: "invalid_quantity" });
            }

            const currentStock = parseInt(snap.data().stockCount, 10) || 0;
            if (currentStock < quantity) {
              throw new HttpsError("failed-precondition",
                `Insufficient stock for ${item.title}. ` +
                `Available: ${currentStock}`,
                { reason: "insufficient_stock" });
            }

            stockUpdates.push({
              ref: snap.ref,
              incrementAmount: -quantity,
            });
          }

          const slotRef = db.collection("slots").doc(selectedSlotId);
          const slotSnap = await transaction.get(slotRef);
          if (!slotSnap.exists) {
            throw new HttpsError("failed-precondition",
              `Selected slot no longer exists.`,
              { reason: "slot_invalid" });
          }

          const slotCtx = slotSnap.data();
          if (!slotCtx.isActive || slotCtx.isLocked) {
            throw new HttpsError("failed-precondition",
              "The selected delivery slot is no longer active.",
              { reason: "slot_inactive" });
          }

          const cap = slotCtx.capacity || 0;
          const ass = slotCtx.assignedOrders || 0;

          if (ass >= cap) {
            throw new HttpsError("failed-precondition",
              "The selected slot is now fully booked. " +
              "Please select another slot.",
              { reason: "slot_full" });
          }

          const avRidersQuery = slotRef.collection("riders")
            .where("assignedOrders", "<", 6)
            .orderBy("assignedOrders", "asc")
            .limit(1);

          const ridersSnap = await transaction.get(avRidersQuery);

          if (ridersSnap.empty) {
            throw new HttpsError("failed-precondition",
              "Currently no slots are available. Please try again later.",
              { reason: "slot_full_riders" });
          }

          const selectedSlotDoc = slotSnap;
          const selectedRiderDoc = ridersSnap.docs[0];

          // 4. Generate New Short Order ID (KF-XXXXXX)
          const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
          let shortId = "KF-";
          for (let i = 0; i < 6; i++) {
            const idx = Math.floor(Math.random() * chars.length);
            shortId += chars.charAt(idx);
          }

          let orderRef = db.collection("orders").doc(shortId);
          const orderSnap = await transaction.get(orderRef);
          if (orderSnap.exists) {
            // If collision, regenerate (though unlikely)
            shortId = "KF-"; // Reset and try again for a fresh ID
            for (let i = 0; i < 6; i++) {
              const idx = Math.floor(Math.random() * chars.length);
              shortId += chars.charAt(idx);
            }
            orderRef = db.collection("orders").doc(shortId);
            // Note: Realistically we should loop until unique, but collision is extremely rare.
          }

          for (const update of stockUpdates) {
            transaction.update(update.ref, { stockCount: admin.firestore.FieldValue.increment(update.incrementAmount) });
          }

          const newSlotAssignedOrders =
            (selectedSlotDoc.data().assignedOrders || 0) + 1;
          transaction.update(selectedSlotDoc.ref,
            { assignedOrders: newSlotAssignedOrders });

          const newRiderAssignedOrders =
            (selectedRiderDoc.data().assignedOrders || 0) + 1;
          transaction.update(selectedRiderDoc.ref,
            { assignedOrders: newRiderAssignedOrders });

          const enrichedOrderData = {
            ...orderData,
            id: shortId, // use new short ID
            slotId: selectedSlotDoc.id,
            riderId: selectedRiderDoc.id,
            status: "ASSIGNED",
            customerName: customerName,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            assignedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          transaction.set(orderRef, enrichedOrderData);

          return enrichedOrderData;
        });

        console.log(`✅ Order ${result.id} successfully created and ` +
          `assigned to requested Slot: ${result.slotId}, ` +
          `Rider: ${result.riderId}`);

        // 6. Send FCM Notification to User (Non-blocking)
        try {
          const userRef = db.collection("users").doc(auth.uid);
          const userSnap = await userRef.get();
          const fcmToken = userSnap.data()?.fcmToken;

          if (fcmToken) {
            const message = {
              notification: {
                title: "Order Successfully Placed!",
                body: `Your order #${result.id} has been confirmed. ` +
                  `Thank you for shopping with Kissan Fresh!`,
              },
              data: {
                orderId: result.id,
                type: "ORDER_PLACED",
              },
              token: fcmToken,
            };
            await admin.messaging().send(message);
            console.log(`FCM notification sent for Order: ${result.id}`);
          } else {
            console.log(`No FCM token found for User: ${auth.uid}. ` +
              `Skipping notification.`);
          }
        } catch (err) {
          console.error(`Error sending FCM notification for order ${result.id}:`, err);
        }

        // 6b. Send FCM Notification to Admin Devices (Non-blocking)
        try {
          const adminTokensSnap = await db.collection("admin_tokens").get();
          if (!adminTokensSnap.empty) {
            const tokens = [];
            adminTokensSnap.forEach((doc) => {
              const t = doc.data().token;
              if (t) {
                tokens.push(t);
              }
            });

            if (tokens.length > 0) {
              const customerName = result.customerName || "Customer";
              const multicastMessage = {
                notification: {
                  title: "New Order Arrived!",
                  body: `New Order Arrived from "${customerName}"`,
                },
                android: {
                  notification: {
                    channelId: "high_importance_channel",
                    sound: "loud_alert",
                  },
                },
                apns: {
                  payload: {
                    aps: {
                      sound: "loud_alert.caf",
                    },
                  },
                },
                data: {
                  orderId: result.id,
                  type: "NEW_ORDER_ADMIN",
                },
                tokens: tokens,
              };

              const response = await admin.messaging().sendEachForMulticast(multicastMessage);
              console.log(`Admin FCM notifications sent: success ${response.successCount}, failure ${response.failureCount}`);

              // Clean up invalid or unregistered tokens from database
              if (response.failureCount > 0) {
                const batch = db.batch();
                response.responses.forEach((resp, idx) => {
                  if (!resp.success) {
                    const error = resp.error;
                    if (error && (error.code === "messaging/registration-token-not-registered" || 
                                  error.code === "messaging/invalid-registration-token")) {
                      const failedToken = tokens[idx];
                      const tokenDocRef = db.collection("admin_tokens").doc(failedToken);
                      batch.delete(tokenDocRef);
                      console.log(`Cleaning up invalid admin token: ${failedToken}`);
                    }
                  }
                });
                await batch.commit();
              }
            }
          } else {
            console.log("No admin FCM tokens found in admin_tokens collection.");
          }
        } catch (adminErr) {
          console.error("Error sending admin FCM notification:", adminErr);
        }

        // 7. Send Telegram Notification to Admin (Non-blocking)
        try {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          const chatId = process.env.TELEGRAM_CHAT_ID;

          if (botToken && chatId) {
            const text = `🛒 <b>New Order Received!</b>\n\n<b>Order ID:</b> ${result.id}\n<b>Slot:</b> ${result.slotId}\n<b>Rider ID:</b> ${result.riderId}\n<b>Status:</b> Confirmed`;

            const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: "HTML",
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error(`Telegram API Error [${result.id}]:`, JSON.stringify(errorData));
            }
          }
        } catch (err) {
          console.error(`Telegram Notification Failed [${result.id}]:`, err.message || err);
        }

          return {
            success: true,
            message: "Order processed successfully",
            orderId: result.id,
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

/**
 * Triggered when an order status is updated.
 * Sends a push notification to the user.
 */
exports.onOrderStatusUpdate = require("firebase-functions/v2/firestore")
  .onDocumentUpdated("orders/{orderId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // Only proceed if status has changed
    if (before.status === after.status) return null;

    const orderId = event.params.orderId;
    const userId = after.userId;
    const newStatus = (after.status || "").toUpperCase();

    if (!userId) return null;

    try {
      // Fetch user token
      const userSnap = await db.collection("users").doc(userId).get();
      const userData = userSnap.data();
      const fcmToken = userData?.fcmToken;

      if (!fcmToken) {
        console.log(`No FCM token found for user ${userId}. Skipping.`);
        return null;
      }

      // Determine message body based on status
      let body = `Your order #${orderId} status has been updated to ${newStatus}.`;

      if (newStatus === "ASSIGNED") {
        body = `Order #${orderId} has been assigned to a rider and will be with you soon.`;
      } else if (newStatus === "OUT FOR DELIVERY") {
        body = `Order #${orderId} is out for delivery! 🚚 Get ready for freshness.`;
      } else if (newStatus === "DELIVERED") {
        body = `Order #${orderId} has been delivered. Enjoy your Kissan Fresh products! 🧺`;
      } else if (newStatus === "CANCELLED") {
        body = `Order #${orderId} has been cancelled. Please contact support if you have questions.`;
      } else if (newStatus === "PROCESSING") {
        body = `Order #${orderId} is now being processed and prepared for delivery.`;
      }

      const message = {
        notification: {
          title: "Order Update",
          body: body,
        },
        data: {
          orderId: orderId,
          type: "ORDER_STATUS_UPDATE",
          status: newStatus,
        },
        token: fcmToken,
      };

      await admin.messaging().send(message);
      console.log(`✅ FCM notification sent for Order: ${orderId}, Status: ${newStatus}`);
    } catch (error) {
      console.error(`🚨 Error sending FCM for order ${orderId}:`, error);
    }
    return null;
  });

/**
 * Sync Firestore Products to Algolia Index
 */
exports.syncProductToAlgolia = require("firebase-functions/v2/firestore")
  .onDocumentWritten({
    document: "products/{productId}",
    secrets: ["ALGOLIA_APP_ID", "ALGOLIA_ADMIN_API_KEY"],
  }, async (event) => {
    const algoliasearch = require("algoliasearch");
    
    // Check if secrets are available in the environment
    const appId = process.env.ALGOLIA_APP_ID;
    const adminKey = process.env.ALGOLIA_ADMIN_API_KEY;
    
    if (!appId || !adminKey) {
        console.error("Algolia credentials are not configured in Firebase Secrets.");
        return null;
    }

    const client = algoliasearch(appId, adminKey);
    const index = client.initIndex("products");
    const productId = event.params.productId;

    // Document was deleted
    if (!event.data.after.exists) {
        try {
            await index.deleteObject(productId);
            console.log(`Successfully deleted product ${productId} from Algolia`);
        } catch (error) {
            console.error(`Error deleting product ${productId} from Algolia`, error);
        }
        return null;
    }

    // Document was created or updated
    const data = event.data.after.data();
    
    const algoliaObject = {
        objectID: productId,
        name: data.name,
        description: data.description,
        category: data.category,
        price: data.price,
        mrp: data.mrp,
        discountPercentage: data.discountPercentage,
        image: data.images && data.images.length > 0 ? data.images[0] : null,
        productOrigin: data.productOrigin,
        inStock: data.inStock,
        tags: data.tags,
        hasVariations: data.hasVariations,
        unit: data.unit,
        unitValue: data.unitValue
    };

    try {
        await index.saveObject(algoliaObject);
        console.log(`Successfully synced product ${productId} to Algolia`);
    } catch (error) {
        console.error(`Error syncing product ${productId} to Algolia`, error);
    }
    
    return null;
  });

