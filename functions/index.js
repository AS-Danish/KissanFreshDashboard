const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({ region: "us-central1" });

const debugWalletFunctions = require("./debug-wallet")({ admin, db });
exports.getDebugWallet = debugWalletFunctions.getDebugWallet;
exports.previewDebugOrderAdjustment = debugWalletFunctions.previewDebugOrderAdjustment;
exports.createDebugOrderAdjustment = debugWalletFunctions.createDebugOrderAdjustment;
exports.refundWalletToBank = debugWalletFunctions.refundWalletToBank;
exports.listDebugWallets = debugWalletFunctions.listDebugWallets;
exports.getDebugWalletDetails = debugWalletFunctions.getDebugWalletDetails;
exports.getDebugOrderAdjustments = debugWalletFunctions.getDebugOrderAdjustments;

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


async function generateSlotsCore(db, admin) {
  try {
    const configSnap = await db.collection("config").doc("slots").get();
    let activeHours = [];
    if (configSnap.exists && configSnap.data().activeHours && configSnap.data().activeHours.length > 0) {
      activeHours = configSnap.data().activeHours;
    } else {
      activeHours = Array.from({length: 16}, (_, i) => i + 6); // 6 to 21
    }
    // Firestore configuration is user-editable, so normalise it before using it
    // in document IDs and date construction. Invalid values used to make the
    // callable fail with a generic "internal" error in the dashboard.
    activeHours = [...new Set(activeHours
      .map((hour) => Number(hour))
      .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23))]
      .sort((a, b) => a - b);
    if (activeHours.length === 0) {
      throw new Error("Choose at least one valid delivery hour (00:00–23:00) before generating slots.");
    }

    const ridersQuery = db.collection("riders")
      .where("status", "==", "ACTIVE");
    const ridersSnap = await ridersQuery.get();
    const activeRiders = ridersSnap.docs.map((doc) => {
      return { id: doc.id, ...doc.data() };
    });

    const capacityPerSlot = activeRiders.length * 6;
    let batch = db.batch();
    let writeCount = 0;

    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // `Intl.DateTimeFormat(...).format()` is locale/ICU dependent. Construct
    // the ID explicitly so slots always use the expected YYYY-MM-DD_HH form.
    const formatDateInIndia = (date) => {
      const parts = Object.fromEntries(formatter.formatToParts(date)
        .filter(({ type }) => type !== "literal")
        .map(({ type, value }) => [type, value]));
      return `${parts.year}-${parts.month}-${parts.day}`;
    };

    let slotsCreated = 0;
    let existingSlots = 0;

    for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
      const targetDate = new Date();
      const dayMs = dayOffset * 24 * 60 * 60 * 1000;
      targetDate.setTime(targetDate.getTime() + dayMs);
      const dateString = formatDateInIndia(targetDate);

      console.log(`Generating slots for date: ${dateString}`);

      for (const hour of activeHours) {
        const hourString = hour.toString().padStart(2, "0");
        const slotId = `${dateString}_${hourString}`;

        const slotRef = db.collection("slots").doc(slotId);
        const slotSnap = await slotRef.get();
        if (slotSnap.exists) {
          existingSlots++;
          continue; // Skip if already created
        }

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
        writeCount++;

        for (const rider of activeRiders) {
          const riderSlotRef = slotRef.collection("riders").doc(rider.id);
          batch.set(riderSlotRef, {
            riderId: rider.riderId || rider.id,
            maxOrders: 6,
            assignedOrders: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          writeCount++;
        }
        
        slotsCreated++;

        if (writeCount > 400) {
          await batch.commit();
          batch = db.batch();
          writeCount = 0;
        }
      }
    }

    if (writeCount > 0) {
      await batch.commit();
    }
    
    console.log(`Successfully generated ${slotsCreated} slots.`);
    return {
      success: true,
      count: slotsCreated,
      existingCount: existingSlots,
      activeRiderCount: activeRiders.length,
    };
  } catch (error) {
    console.error("Error generating daily slots:", error);
    throw error;
  }
}

exports.generateDailySlots = require("firebase-functions/v2/scheduler")
  .onSchedule({
    schedule: "0 0 * * *",
    timeZone: "Asia/Kolkata",
    retryCount: 3,
  }, async (event) => {
    await generateSlotsCore(db, admin);
  });

exports.manualGenerateSlots = require("firebase-functions/v2/https")
  .onCall(async (request) => {
    const { HttpsError } = require("firebase-functions/v2/https");
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to generate slots.");
    }

    try {
      const requesterDoc = await db.collection("users").doc(request.auth.uid).get();
      const requester = requesterDoc.data();
      const role = requester?.role?.toUpperCase();
      const canManageSlots = role === "ADMIN" ||
        (role === "MANAGEMENT" && requester?.permissions?.["Slot Management"] === true);

      if (!requesterDoc.exists || !canManageSlots) {
        throw new HttpsError("permission-denied", "You do not have permission to generate slots.");
      }

      const result = await generateSlotsCore(db, admin);
      return result;
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error.message);
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

    const { paymentId } = data;

    if (!paymentId) {
      console.error(`Document ${docId} missing paymentId. ` +
        `Cannot process refund.`);
      return snapshot.ref.update({
        refundStatus: "failed",
        refundError: "Missing paymentId",
      });
    }

    const rKey = (process.env.RAZORPAY_KEY || "").trim();
    const rSecret = (process.env.RAZORPAY_SECRET || "").trim();

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
      const payment = await razorpay.payments.fetch(paymentId);
      console.log(`Current Payment Status: ${payment.status}`);

      if (payment.status === "authorized") {
        console.log(`Payment ${paymentId} is authorized. Capturing now...`);
        const captureResponse = await razorpay.payments.capture(paymentId,
          payment.amount, payment.currency || "INR");
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
      const runtimeProjectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || admin.app().options.projectId;
      const isDebugWalletRuntime = process.env.KISSAN_ENV === "debug" &&
        runtimeProjectId && runtimeProjectId !== "kissanfresh-a72c1";
      const requestedWalletPaise = Number.parseInt(orderData?.walletAppliedPaise, 10) || 0;

      if (!auth) {
        throw new HttpsError("unauthenticated",
          "User must be logged in to place an order.");
      }

      if (!orderData || !orderData.items || orderData.items.length === 0) {
        throw new HttpsError("invalid-argument", "Missing order items.");
      }

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

          let walletRef = null;
          let walletData = null;
          if (requestedWalletPaise > 0) {
            if (!isDebugWalletRuntime) {
              throw new HttpsError("failed-precondition", "Wallet checkout is available only in the debug environment.");
            }
            if (requestedWalletPaise > Math.round(Number(orderData.totalAmount || 0) * 100)) {
              throw new HttpsError("invalid-argument", "Wallet amount exceeds the order total.");
            }
            walletRef = db.collection("debug_wallet_accounts").doc(auth.uid);
            const walletSnap = await transaction.get(walletRef);
            walletData = walletSnap.data() || {};
            if ((Number(walletData.balancePaise) || 0) < requestedWalletPaise) {
              throw new HttpsError("failed-precondition", "Wallet balance changed. Refresh checkout and try again.");
            }
          }

          let couponDoc = null;
          if (orderData.couponCode) {
            const couponQuery = db.collection("coupons")
              .where("code", "==", orderData.couponCode.toString().trim().toUpperCase())
              .limit(1);
            const couponSnapshot = await transaction.get(couponQuery);
            if (couponSnapshot.empty) {
              throw new HttpsError("failed-precondition", "The selected coupon is no longer available.");
            }
            couponDoc = couponSnapshot.docs[0];
            const coupon = couponDoc.data();
            const usageLimit = Number(coupon.totalUsageLimit || 0);
            const usageCount = Number(coupon.currentUsageCount || 0);
            if (!coupon.isActive || (usageLimit > 0 && usageCount >= usageLimit)) {
              throw new HttpsError("failed-precondition", "The selected coupon has expired or reached its usage limit.");
            }
          }

          const uniqueProductIds = [...new Set(orderData.items.map((item) => item.productId))];
          const productRefs = uniqueProductIds.map((id) => db.collection("products").doc(id));
          const productSnaps = await transaction.getAll(...productRefs);
          
          const productDataMap = {};
          const productRefMap = {};

          for (const snap of productSnaps) {
            if (!snap.exists) {
              throw new HttpsError("failed-precondition", "A product in your order is no longer available.", {reason: "product_unavailable"});
            }
            productDataMap[snap.id] = snap.data();
            productRefMap[snap.id] = snap.ref;
          }

          for (const item of orderData.items) {
            const data = productDataMap[item.productId];
            const quantity = parseInt(item.quantity, 10);
            if (isNaN(quantity) || quantity < 1) {
              throw new HttpsError("invalid-argument", `Invalid quantity for ${item.title}.`, { reason: "invalid_quantity" });
            }

            if (data.hasVariations && data.variations && data.variations.length > 0) {
              let varIndex = -1;
              if (item.variationId) {
                varIndex = data.variations.findIndex((v) => {
                  const vId = v.id ? v.id.toString() : null;
                  if (vId !== null && vId === item.variationId) return true;
                  const altId = `${v.unitValue || ""}${v.unit || ""}`;
                  if (altId === item.variationId) return true;
                  if (vId === null && item.variationId === "null") return true;
                  return false;
                });
              }
              
              if (varIndex === -1) {
                varIndex = 0;
              }

              const variation = data.variations[varIndex];
              const currentStock = parseInt(variation.stockCount, 10) || 0;

              if (currentStock < quantity) {
                throw new HttpsError("failed-precondition",
                    `Insufficient stock for ${item.title} (${item.unit}). Available: ${currentStock}`,
                    {reason: "insufficient_stock"});
              }

              data.variations[varIndex].stockCount = currentStock - quantity;
              if (data.variations[varIndex].stockCount <= 0) {
                data.variations[varIndex].inStock = false;
              }
            } else {
              const currentStock = parseInt(data.stockCount, 10) || 0;
              
              if (currentStock < quantity) {
                throw new HttpsError("failed-precondition",
                    `Insufficient stock for ${item.title}. Available: ${currentStock}`,
                    {reason: "insufficient_stock"});
              }

              data.stockCount = currentStock - quantity;
              if (data.stockCount <= 0) {
                data.inStock = false;
              }
            }
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

          for (const id of uniqueProductIds) {
            transaction.update(productRefMap[id], productDataMap[id]);
          }

          if (couponDoc) {
            transaction.update(couponDoc.ref, {
              currentUsageCount: admin.firestore.FieldValue.increment(1),
            });
          }

          const newSlotAssignedOrders =
            (selectedSlotDoc.data().assignedOrders || 0) + 1;
          transaction.update(selectedSlotDoc.ref,
            { assignedOrders: newSlotAssignedOrders });

          const newRiderAssignedOrders =
            (selectedRiderDoc.data().assignedOrders || 0) + 1;
          transaction.update(selectedRiderDoc.ref,
            { assignedOrders: newRiderAssignedOrders });

          const cleanOrderData = { ...orderData };
          delete cleanOrderData.walletAppliedPaise;
          const enrichedOrderData = {
            ...cleanOrderData,
            id: shortId, // use new short ID
            userId: auth.uid,
            slotId: selectedSlotDoc.id,
            riderId: selectedRiderDoc.id,
            status: "ASSIGNED",
            customerName: customerName,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            assignedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(requestedWalletPaise > 0 ? { walletAppliedPaise: requestedWalletPaise } : {}),
          };

          transaction.set(orderRef, enrichedOrderData);
          if (walletRef) {
            transaction.update(walletRef, {
              balancePaise: (Number(walletData.balancePaise) || 0) - requestedWalletPaise,
              lifetimeDebitPaise: (Number(walletData.lifetimeDebitPaise) || 0) + requestedWalletPaise,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            transaction.create(db.collection("debug_wallet_entries").doc(`order_${shortId}`), {
              userId: auth.uid,
              orderId: shortId,
              type: "ORDER_DEBIT",
              amountPaise: -requestedWalletPaise,
              currency: "INR",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }

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

        // 6c. Send FCM Notification to Dashboard Devices (Non-blocking)
        try {
          const dashboardTokensSnap = await db.collection("dashboard_tokens").get();
          if (!dashboardTokensSnap.empty) {
            const tokens = [];
            dashboardTokensSnap.forEach((doc) => {
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
                data: {
                  orderId: result.id,
                  type: "NEW_ORDER_DASHBOARD",
                },
                tokens: tokens,
              };

              const response = await admin.messaging().sendEachForMulticast(multicastMessage);
              console.log(`Dashboard FCM notifications sent: success ${response.successCount}, failure ${response.failureCount}`);

              // Clean up invalid or unregistered tokens from database
              if (response.failureCount > 0) {
                const batch = db.batch();
                response.responses.forEach((resp, idx) => {
                  if (!resp.success) {
                    const error = resp.error;
                    if (error && (error.code === "messaging/registration-token-not-registered" || 
                                  error.code === "messaging/invalid-registration-token")) {
                      const failedToken = tokens[idx];
                      const tokenDocRef = db.collection("dashboard_tokens").doc(failedToken);
                      batch.delete(tokenDocRef);
                      console.log(`Cleaning up invalid dashboard token: ${failedToken}`);
                    }
                  }
                });
                await batch.commit();
              }
            }
          } else {
            console.log("No dashboard FCM tokens found in dashboard_tokens collection.");
          }
        } catch (dashboardErr) {
          console.error("Error sending dashboard FCM notification:", dashboardErr);
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

/**
 * Triggered when a new offer notification is created.
 * If it's marked as instant, send it immediately.
 */
exports.onInstantOfferCreated = require("firebase-functions/v2/firestore")
  .onDocumentCreated("offer_notifications/{docId}", async (event) => {
    const data = event.data.data();
    if (!data) return null;

    if (data.isInstant && data.status === "PENDING") {
      const message = {
        topic: "all_users",
        notification: {
          title: data.title,
          body: data.body,
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
          type: "OFFER_NOTIFICATION",
          docId: event.params.docId,
        },
      };

      if (data.imageUrl) {
        message.notification.imageUrl = data.imageUrl;
      }

      try {
        await admin.messaging().send(message);
        console.log(`✅ Instant offer sent for doc ${event.params.docId}`);
        return event.data.ref.update({
          status: "SENT",
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (error) {
        console.error(`🚨 Error sending instant offer ${event.params.docId}:`, error);
        return event.data.ref.update({
          status: "FAILED",
          error: error.message,
        });
      }
    }
    return null;
  });

/**
 * Scheduled function to process scheduled offers.
 * Runs every 4 hours.
 */
exports.processScheduledOffers = require("firebase-functions/v2/scheduler")
  .onSchedule({
    schedule: "0 */4 * * *",
    timeZone: "Asia/Kolkata",
    retryCount: 3,
  }, async (event) => {
    const now = admin.firestore.Timestamp.now();
    try {
      const pendingOffersSnap = await db.collection("offer_notifications")
        .where("status", "==", "PENDING")
        .where("isInstant", "==", false)
        .where("scheduledFor", "<=", now)
        .get();

      if (pendingOffersSnap.empty) {
        console.log("No pending scheduled offers found.");
        return null;
      }

      const batch = db.batch();

      for (const doc of pendingOffersSnap.docs) {
        const data = doc.data();
        
        const message = {
          topic: "all_users",
          notification: {
            title: data.title,
            body: data.body,
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
            type: "OFFER_NOTIFICATION",
            docId: doc.id,
          },
        };

        if (data.imageUrl) {
          message.notification.imageUrl = data.imageUrl;
        }

        try {
          await admin.messaging().send(message);
          console.log(`✅ Scheduled offer sent for doc ${doc.id}`);
          batch.update(doc.ref, {
            status: "SENT",
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (error) {
          console.error(`🚨 Error sending scheduled offer ${doc.id}:`, error);
          batch.update(doc.ref, {
            status: "FAILED",
            error: error.message,
          });
        }
      }

      await batch.commit();
      console.log(`Processed ${pendingOffersSnap.size} scheduled offers.`);
    } catch (error) {
      console.error("Error in processScheduledOffers:", error);
    }
    return null;
  });

/**
 * Callable function to create management users.
 * Only accessible by an existing ADMIN.
 */
exports.createUser = require("firebase-functions/v2/https")
  .onCall(async (request) => {
    const data = request.data;
    const auth = request.auth;
    const { HttpsError } = require("firebase-functions/v2/https");

    if (!auth) {
      throw new HttpsError("unauthenticated", "You must be logged in to create a user.");
    }

    try {
      // Verify requester is an ADMIN
      const requesterDoc = await db.collection("users").doc(auth.uid).get();
      if (!requesterDoc.exists || requesterDoc.data()?.role?.toUpperCase() !== "ADMIN") {
        throw new HttpsError("permission-denied", "Only administrators can create users.");
      }

      const { email, password, role } = data;

      if (!email || !password || !role) {
        throw new HttpsError("invalid-argument", "Missing required fields (email, password, role).");
      }

      const upperRole = role.toUpperCase();
      if (upperRole !== "ADMIN" && upperRole !== "MANAGEMENT") {
        throw new HttpsError("invalid-argument", "Role must be ADMIN or MANAGEMENT.");
      }

      // Create user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
      });

      // Create user document in Firestore
      await db.collection("users").doc(userRecord.uid).set({
        email: email,
        role: upperRole,
        permissions: {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        uid: userRecord.uid,
        message: "User successfully created.",
      };
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message);
    }
  });

/**
 * Callable function to update a user's password.
 * Only accessible by an existing ADMIN.
 */
exports.updateUserPassword = require("firebase-functions/v2/https")
  .onCall(async (request) => {
    const data = request.data;
    const auth = request.auth;
    const { HttpsError } = require("firebase-functions/v2/https");

    if (!auth) {
      throw new HttpsError("unauthenticated", "You must be logged in to update a password.");
    }

    try {
      // Verify requester is an ADMIN
      const requesterDoc = await db.collection("users").doc(auth.uid).get();
      if (!requesterDoc.exists || requesterDoc.data()?.role?.toUpperCase() !== "ADMIN") {
        throw new HttpsError("permission-denied", "Only administrators can update passwords.");
      }

      const { uid, newPassword } = data;

      if (!uid || !newPassword) {
        throw new HttpsError("invalid-argument", "Missing required fields (uid, newPassword).");
      }

      if (newPassword.length < 6) {
        throw new HttpsError("invalid-argument", "Password must be at least 6 characters long.");
      }

      // Update user password in Firebase Auth
      await admin.auth().updateUser(uid, {
        password: newPassword,
      });

      return {
        success: true,
        message: "Password updated successfully.",
      };
    } catch (error) {
      console.error("Error updating user password:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message);
    }
  });
