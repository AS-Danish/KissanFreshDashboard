const { onCall, HttpsError } = require("firebase-functions/v2/https");

const PRODUCTION_PROJECT_ID = "kissanfresh-a72c1";
const MAX_LINES = 50;

module.exports = function createDebugWalletFunctions({ admin, db }) {
  function assertDebugEnvironment() {
    const projectId = process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT || admin.app().options.projectId;
    if (!projectId) {
      throw new HttpsError("failed-precondition",
        "Firebase project ID could not be determined.");
    }
  }

  async function assertOrderManager(auth) {
    if (!auth) throw new HttpsError("unauthenticated", "Sign in first.");
    const user = await db.collection("users").doc(auth.uid).get();
    const data = user.data() || {};
    const role = String(data.role || "").toUpperCase();
    const allowed = role === "ADMIN" ||
      (role === "MANAGEMENT" && data.permissions?.["Order Management"] === true);
    if (!allowed) {
      throw new HttpsError("permission-denied", "Order Management permission is required.");
    }
    return data;
  }

  function asPaise(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 0;
    return Math.max(0, Math.round(amount * 100));
  }

  function calculateAdjustment(order, requestedLines) {
    if (!Array.isArray(order.items) || order.items.length === 0) {
      throw new HttpsError("failed-precondition", "Order has no refundable item snapshot.");
    }
    if (!Array.isArray(requestedLines) || requestedLines.length === 0 ||
        requestedLines.length > MAX_LINES) {
      throw new HttpsError("invalid-argument", "Select at least one valid order line.");
    }

    const grossPaise = order.items.reduce((sum, item) =>
      sum + asPaise(item.price) * Math.max(0, Number.parseInt(item.quantity, 10) || 0), 0);
    const itemNetPaise = Math.max(0,
      asPaise(order.subtotal) - asPaise(order.discount) - asPaise(order.couponDiscount));
    const paidMerchandisePaise = Math.min(grossPaise,
      itemNetPaise || Math.max(0, asPaise(order.totalAmount) - asPaise(order.deliveryFee)));
    if (grossPaise <= 0 || paidMerchandisePaise <= 0) {
      throw new HttpsError("failed-precondition", "Order has no paid merchandise value.");
    }

    const alreadyAdjusted = order.debugAdjustedQuantities || {};
    const seen = new Set();
    const lines = requestedLines.map((requestLine) => {
      const lineIndex = Number.parseInt(requestLine.lineIndex, 10);
      const quantity = Number.parseInt(requestLine.quantity, 10);
      if (!Number.isInteger(lineIndex) || lineIndex < 0 || lineIndex >= order.items.length ||
          !Number.isInteger(quantity) || quantity < 1 || seen.has(lineIndex)) {
        throw new HttpsError("invalid-argument", "Invalid or duplicate order line selection.");
      }
      seen.add(lineIndex);
      const item = order.items[lineIndex];
      const ordered = Number.parseInt(item.quantity, 10) || 0;
      const previous = Number.parseInt(alreadyAdjusted[String(lineIndex)], 10) || 0;
      if (quantity > ordered - previous) {
        throw new HttpsError("failed-precondition",
          `${item.title || "Item"} only has ${ordered - previous} refundable unit(s) remaining.`);
      }
      const grossLinePaise = asPaise(item.price) * quantity;
      return {
        lineIndex,
        productId: String(item.productId || ""),
        variationId: item.variationId == null ? null : String(item.variationId),
        title: String(item.title || "Item"),
        quantity,
        amountPaise: Math.floor(grossLinePaise * paidMerchandisePaise / grossPaise),
      };
    });

    const amountPaise = lines.reduce((sum, line) => sum + line.amountPaise, 0);
    const remainingOrderPaise = Math.max(0,
      paidMerchandisePaise - (Number(order.debugAdjustedAmountPaise) || 0));
    if (amountPaise < 1 || amountPaise > remainingOrderPaise) {
      throw new HttpsError("failed-precondition", "The selected amount is no longer refundable.");
    }
    return { amountPaise, lines };
  }

  const getDebugWallet = onCall(async (request) => {
    assertDebugEnvironment();
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
    const uid = request.auth.uid;
    const [account, entries] = await Promise.all([
      db.collection("debug_wallet_accounts").doc(uid).get(),
      db.collection("debug_wallet_entries").where("userId", "==", uid)
        .limit(100).get(),
    ]);
    const sortedEntries = entries.docs
      .sort((a, b) => (b.data().createdAt?.toMillis?.() || 0) -
        (a.data().createdAt?.toMillis?.() || 0))
      .slice(0, 30);
    return {
      balancePaise: Number(account.data()?.balancePaise) || 0,
      entries: sortedEntries.map((doc) => ({ id: doc.id, ...doc.data() })),
    };
  });

  const previewDebugOrderAdjustment = onCall(async (request) => {
    assertDebugEnvironment();
    await assertOrderManager(request.auth);
    const orderId = String(request.data?.orderId || "").trim();
    if (!orderId) throw new HttpsError("invalid-argument", "orderId is required.");
    const order = await db.collection("orders").doc(orderId).get();
    if (!order.exists) throw new HttpsError("not-found", "Order not found.");
    return calculateAdjustment(order.data(), request.data?.lines);
  });

  const createDebugOrderAdjustment = onCall({
    secrets: ["RAZORPAY_KEY", "RAZORPAY_SECRET"],
  }, async (request) => {
    assertDebugEnvironment();
    await assertOrderManager(request.auth);
    const orderId = String(request.data?.orderId || "").trim();
    const destination = String(request.data?.destination || "").toUpperCase();
    const reason = String(request.data?.reason || "").trim().slice(0, 500);
    const idempotencyKey = String(request.data?.idempotencyKey || "").trim();
    if (!orderId || !reason || !["WALLET", "SOURCE_REFUND"].includes(destination) ||
        !/^[A-Za-z0-9_-]{16,80}$/.test(idempotencyKey)) {
      throw new HttpsError("invalid-argument", "Order, reason, destination and idempotency key are required.");
    }

    const adjustmentRef = db.collection("debug_order_adjustments").doc(idempotencyKey);
    let createdAdjustment;
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(adjustmentRef);
      if (existing.exists) {
        createdAdjustment = { id: existing.id, ...existing.data(), duplicate: true };
        return;
      }
      const orderRef = db.collection("orders").doc(orderId);
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists) throw new HttpsError("not-found", "Order not found.");
      const order = orderSnap.data();
      if (!order.userId) throw new HttpsError("failed-precondition", "Order has no customer.");

      const orderStatus = (order.status || "").toUpperCase();
      if (orderStatus === "DELIVERED") {
        throw new HttpsError("failed-precondition", "Item adjustments can only be issued before order delivery. This order is already delivered.");
      }
      if (orderStatus === "CANCELLED") {
        throw new HttpsError("failed-precondition", "Item adjustments cannot be made on a cancelled order.");
      }

      const calculation = calculateAdjustment(order, request.data?.lines);
      let walletRef;
      let wallet = {};
      if (destination === "WALLET") {
        walletRef = db.collection("debug_wallet_accounts").doc(order.userId);
        const walletSnap = await transaction.get(walletRef);
        wallet = walletSnap.data() || {};
      }
      const adjusted = { ...(order.debugAdjustedQuantities || {}) };
      calculation.lines.forEach((line) => {
        const key = String(line.lineIndex);
        adjusted[key] = (Number(adjusted[key]) || 0) + line.quantity;
      });
      createdAdjustment = {
        orderId,
        userId: order.userId,
        paymentId: order.paymentId || null,
        destination,
        reason,
        amountPaise: calculation.amountPaise,
        lines: calculation.lines,
        status: destination === "WALLET" ? "SUCCEEDED" : "PROCESSING",
        createdBy: request.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      transaction.create(adjustmentRef, createdAdjustment);
      transaction.update(orderRef, {
        debugAdjustedQuantities: adjusted,
        debugAdjustedAmountPaise: (Number(order.debugAdjustedAmountPaise) || 0) + calculation.amountPaise,
        debugLastAdjustmentAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (destination === "WALLET") {
        transaction.set(walletRef, {
          userId: order.userId,
          currency: "INR",
          balancePaise: (Number(wallet.balancePaise) || 0) + calculation.amountPaise,
          lifetimeCreditPaise: (Number(wallet.lifetimeCreditPaise) || 0) + calculation.amountPaise,
          lifetimeDebitPaise: Number(wallet.lifetimeDebitPaise) || 0,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        transaction.create(db.collection("debug_wallet_entries").doc(idempotencyKey), {
          userId: order.userId,
          orderId,
          adjustmentId: idempotencyKey,
          type: "REFUND_CREDIT",
          amountPaise: calculation.amountPaise,
          currency: "INR",
          reason,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    if (createdAdjustment.duplicate || destination === "WALLET") {
      // Send real-time FCM notification to customer device
      if (destination === "WALLET") {
        try {
          const userDoc = await db.collection("users").doc(createdAdjustment.userId).get();
          const userData = userDoc.exists ? userDoc.data() : {};
          const fcmToken = userData?.fcmToken;
          const tokens = Array.isArray(userData?.fcmTokens)
            ? userData.fcmTokens.filter(Boolean)
            : fcmToken ? [fcmToken] : [];

          if (tokens.length > 0) {
            const itemsSummary = (createdAdjustment.lines || [])
              .map((l) => `${l.title} (${l.quantity}x)`)
              .join(", ") || "Refunded items";
            const amountFormatted = `₹${(createdAdjustment.amountPaise / 100).toFixed(2)}`;

            const message = {
              notification: {
                title: `${amountFormatted} Credited to Your Wallet! 👛`,
                body: `Refund for Order #${orderId}: ${itemsSummary} credited to your Kissan Fresh wallet. Reason: ${reason}`,
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
                orderId: String(orderId),
                type: "WALLET_REFUND_CREDITED",
                amountPaise: String(createdAdjustment.amountPaise),
                reason: String(reason),
              },
            };

            if (tokens.length === 1) {
              await admin.messaging().send({ ...message, token: tokens[0] });
            } else {
              await admin.messaging().sendEachForMulticast({ ...message, tokens });
            }
            console.log(`✅ FCM wallet refund notification sent to user ${createdAdjustment.userId} for order ${orderId}`);
          } else {
            console.log(`No FCM token found for user ${createdAdjustment.userId}; skipping push notification.`);
          }
        } catch (fcmErr) {
          console.error("Error sending FCM wallet refund notification:", fcmErr);
        }
      }

      return { id: idempotencyKey, ...createdAdjustment };
    }
    const releaseFailedReservation = async (message) => {
      await db.runTransaction(async (transaction) => {
        const adjustmentSnap = await transaction.get(adjustmentRef);
        if (!adjustmentSnap.exists || adjustmentSnap.data().reservationReleased === true) return;
        const adjustment = adjustmentSnap.data();
        const orderRef = db.collection("orders").doc(orderId);
        const orderSnap = await transaction.get(orderRef);
        if (orderSnap.exists) {
          const order = orderSnap.data();
          const adjusted = { ...(order.debugAdjustedQuantities || {}) };
          adjustment.lines.forEach((line) => {
            const key = String(line.lineIndex);
            adjusted[key] = Math.max(0, (Number(adjusted[key]) || 0) - line.quantity);
          });
          transaction.update(orderRef, {
            debugAdjustedQuantities: adjusted,
            debugAdjustedAmountPaise: Math.max(0,
              (Number(order.debugAdjustedAmountPaise) || 0) - adjustment.amountPaise),
          });
        }
        transaction.update(adjustmentRef, {
          status: "FAILED",
          error: String(message).slice(0, 500),
          reservationReleased: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    };
    if (!createdAdjustment.paymentId) {
      await releaseFailedReservation("Order has no online payment ID.");
      throw new HttpsError("failed-precondition", "Source refund is unavailable for this order; use wallet credit.");
    }
    const keyId = (process.env.RAZORPAY_KEY || "").trim();
    const keySecret = (process.env.RAZORPAY_SECRET || "").trim();
    if (!keyId || !keySecret) {
      await releaseFailedReservation("Razorpay credentials are not configured in Firebase Secrets.");
      throw new HttpsError("failed-precondition", "Razorpay credentials are not configured in Firebase Secrets.");
    }

    try {
      const Razorpay = require("razorpay");
      const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const payment = await razorpay.payments.fetch(createdAdjustment.paymentId);
      if (payment.status === "authorized") {
        console.log(`Payment ${createdAdjustment.paymentId} is authorized. Auto-capturing before refund...`);
        await razorpay.payments.capture(createdAdjustment.paymentId, payment.amount, payment.currency || "INR");
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } else if (payment.status !== "captured") {
        throw new Error(`Payment is ${payment.status}, not captured.`);
      }
      const refund = await razorpay.payments.refund(createdAdjustment.paymentId, {
        amount: createdAdjustment.amountPaise,
        speed: "optimum",
        notes: { debug_adjustment_id: idempotencyKey, order_id: orderId },
      });
      await adjustmentRef.update({
        status: refund.status === "processed" ? "SUCCEEDED" : "PENDING_PROVIDER",
        providerRefundId: refund.id,
        providerStatus: refund.status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { id: idempotencyKey, amountPaise: createdAdjustment.amountPaise,
        destination, status: refund.status, providerRefundId: refund.id };
    } catch (error) {
      const errDesc = error?.error?.description || error?.message || "Refund failed";
      await releaseFailedReservation(errDesc);
      throw new HttpsError("internal", `Source refund failed: ${errDesc}`);
    }
  });

  const refundWalletToBank = onCall({
    secrets: ["RAZORPAY_KEY", "RAZORPAY_SECRET"],
  }, async (request) => {
    assertDebugEnvironment();
    await assertOrderManager(request.auth);
    const orderId = String(request.data?.orderId || "").trim();
    const userId = String(request.data?.userId || "").trim();
    const amountPaise = Number.parseInt(request.data?.amountPaise, 10);
    const idempotencyKey = String(request.data?.idempotencyKey || "").trim();

    if (!orderId || !userId || !Number.isInteger(amountPaise) || amountPaise <= 0 ||
        !/^[A-Za-z0-9_-]{12,80}$/.test(idempotencyKey)) {
      throw new HttpsError("invalid-argument", "Valid orderId, userId, amountPaise and idempotencyKey are required.");
    }

    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) throw new HttpsError("not-found", "Order not found.");
    const order = orderDoc.data();

    if ((order.orderType || "").toUpperCase() === "COD" || !order.paymentId) {
      throw new HttpsError("failed-precondition",
        "COD orders cannot be refunded to bank because no online payment was made. Only wallet credits apply to COD orders.");
    }

    const walletRef = db.collection("debug_wallet_accounts").doc(userId);
    const walletSnap = await walletRef.get();
    const walletData = walletSnap.data() || {};
    const availablePaise = Number(walletData.balancePaise) || 0;

    if (availablePaise <= 0) {
      throw new HttpsError("failed-precondition", "Customer has ₹0.00 available in their wallet.");
    }

    // Verify order's wallet credit has not already been consumed by subsequent orders or refunded
    const entriesSnap = await db.collection("debug_wallet_entries")
      .where("userId", "==", userId)
      .get();
    const entries = entriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    entries.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));

    const creditBuckets = [];
    for (const e of entries) {
      if (e.type === "REFUND_CREDIT" && (e.amountPaise || 0) > 0) {
        creditBuckets.push({
          orderId: e.orderId,
          remainingPaise: Number(e.amountPaise) || 0,
        });
      } else if (e.type === "BANK_REFUND_DEBIT" && (e.amountPaise || 0) < 0) {
        const debit = Math.abs(Number(e.amountPaise) || 0);
        const match = creditBuckets.find((b) => b.orderId === e.orderId && b.remainingPaise > 0);
        if (match) {
          match.remainingPaise = Math.max(0, match.remainingPaise - debit);
        }
      } else if (e.type === "ORDER_DEBIT" || (Number(e.amountPaise) || 0) < 0) {
        let debit = Math.abs(Number(e.amountPaise) || 0);
        for (const bucket of creditBuckets) {
          if (debit <= 0) break;
          if (bucket.remainingPaise > 0) {
            const take = Math.min(bucket.remainingPaise, debit);
            bucket.remainingPaise -= take;
            debit -= take;
          }
        }
      }
    }

    const orderCredit = creditBuckets.find((b) => b.orderId === orderId);
    if (!orderCredit || orderCredit.remainingPaise <= 0) {
      throw new HttpsError("failed-precondition",
        `The wallet credit from Order ${orderId} was already used on another order or refunded to bank. No balance remains from this order.`);
    }

    const maxRefundable = Math.min(orderCredit.remainingPaise, availablePaise);
    const finalRefundAmount = Math.min(amountPaise, maxRefundable);
    if (finalRefundAmount <= 0) {
      throw new HttpsError("failed-precondition", "No refundable balance remains from this order.");
    }

    const keyId = (process.env.RAZORPAY_KEY || "").trim();
    const keySecret = (process.env.RAZORPAY_SECRET || "").trim();
    if (!keyId || !keySecret) {
      throw new HttpsError("failed-precondition", "Razorpay credentials are not configured in Firebase Secrets.");
    }

    const Razorpay = require("razorpay");
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    let payment;
    try {
      payment = await razorpay.payments.fetch(order.paymentId);
    } catch (fetchErr) {
      console.error("Razorpay payment fetch error:", fetchErr);
      const desc = fetchErr?.error?.description || fetchErr?.message || "Payment not found";
      throw new HttpsError("failed-precondition", `Razorpay payment verification failed: ${desc}`);
    }

    if (payment.status === "authorized") {
      try {
        console.log(`Payment ${order.paymentId} is authorized. Auto-capturing before refund...`);
        await razorpay.payments.capture(order.paymentId, payment.amount, payment.currency || "INR");
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (capErr) {
        console.error("Auto-capture failed:", capErr);
        const desc = capErr?.error?.description || capErr?.message || "Could not capture authorized payment";
        throw new HttpsError("failed-precondition", `Payment is in 'authorized' state and auto-capture failed: ${desc}`);
      }
    } else if (payment.status !== "captured") {
      throw new HttpsError("failed-precondition", `Original payment is in state '${payment.status}', not captured.`);
    }

    let refund;
    try {
      refund = await razorpay.payments.refund(order.paymentId, {
        amount: finalRefundAmount,
        speed: "optimum",
        notes: {
          order_id: orderId,
          user_id: userId,
          action: "WALLET_TO_BANK_REFUND",
          admin_uid: request.auth.uid,
        },
      });
    } catch (err) {
      console.error("Razorpay refund error:", err);
      const desc = err?.error?.description || err?.message || "Razorpay refund request failed.";
      throw new HttpsError("internal", `Razorpay refund failed: ${desc}`);
    }

    // Atomically debit wallet and record entries
    await db.runTransaction(async (transaction) => {
      const currentWalletSnap = await transaction.get(walletRef);
      const currentBalance = Number(currentWalletSnap.data()?.balancePaise) || 0;
      if (currentBalance < finalRefundAmount) {
        throw new HttpsError("aborted", "Wallet balance changed concurrently. Payout aborted.");
      }

      transaction.update(walletRef, {
        balancePaise: currentBalance - finalRefundAmount,
        lifetimeDebitPaise: (Number(currentWalletSnap.data()?.lifetimeDebitPaise) || 0) + finalRefundAmount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const entryRef = db.collection("debug_wallet_entries").doc(`bank_${idempotencyKey}`);
      transaction.set(entryRef, {
        userId,
        orderId,
        type: "BANK_REFUND_DEBIT",
        amountPaise: -finalRefundAmount,
        currency: "INR",
        paymentId: order.paymentId,
        providerRefundId: refund.id,
        providerStatus: refund.status,
        speed: refund.speed_processed || refund.speed_requested || "optimum",
        reason: `Instant refund to original bank account via Razorpay (${refund.id})`,
        createdBy: request.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const adjRef = db.collection("debug_order_adjustments").doc(`bank_${idempotencyKey}`);
      transaction.set(adjRef, {
        orderId,
        userId,
        paymentId: order.paymentId,
        destination: "SOURCE_REFUND",
        reason: "Customer requested wallet balance transferred to original bank",
        amountPaise: finalRefundAmount,
        providerRefundId: refund.id,
        providerStatus: refund.status,
        status: refund.status === "processed" ? "SUCCEEDED" : "PENDING_PROVIDER",
        createdBy: request.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // Send FCM notification to customer informing them of bank refund
    try {
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      const fcmToken = userData?.fcmToken;
      const tokens = Array.isArray(userData?.fcmTokens)
        ? userData.fcmTokens.filter(Boolean)
        : fcmToken ? [fcmToken] : [];

      if (tokens.length > 0) {
        const amountFormatted = `₹${(finalRefundAmount / 100).toFixed(2)}`;
        const message = {
          notification: {
            title: `${amountFormatted} Refunded to Your Bank 🏦`,
            body: `Your refund of ${amountFormatted} for Order #${orderId} has been sent to your original bank account (Razorpay Refund ID: ${refund.id}).`,
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
            orderId: String(orderId),
            type: "BANK_REFUND_PROCESSED",
            amountPaise: String(finalRefundAmount),
            providerRefundId: String(refund.id),
          },
        };

        if (tokens.length === 1) {
          await admin.messaging().send({ ...message, token: tokens[0] });
        } else {
          await admin.messaging().sendEachForMulticast({ ...message, tokens });
        }
        console.log(`✅ FCM bank refund notification sent to user ${userId} for order ${orderId}`);
      }
    } catch (notifyErr) {
      console.error("Error sending FCM bank refund notification:", notifyErr);
    }

    return {
      success: true,
      providerRefundId: refund.id,
      providerStatus: refund.status,
      amountPaise: finalRefundAmount,
    };
  });

  const listDebugWallets = onCall(async (request) => {
    assertDebugEnvironment();
    await assertOrderManager(request.auth);

    const snapshot = await db.collection("debug_wallet_accounts").limit(100).get();
    const wallets = [];

    for (const doc of snapshot.docs) {
      const data = doc.data() || {};
      const userDoc = await db.collection("users").doc(doc.id).get();
      const userData = userDoc.data() || {};
      wallets.push({
        userId: doc.id,
        balancePaise: Number(data.balancePaise) || 0,
        lifetimeCreditPaise: Number(data.lifetimeCreditPaise) || 0,
        lifetimeDebitPaise: Number(data.lifetimeDebitPaise) || 0,
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
        userName: userData.name || userData.displayName || "Customer",
        userPhone: userData.phoneNumber || userData.phone || "No phone",
        userEmail: userData.email || "",
      });
    }

    return wallets.sort((a, b) => b.balancePaise - a.balancePaise);
  });

  const getDebugWalletDetails = onCall(async (request) => {
    assertDebugEnvironment();
    await assertOrderManager(request.auth);
    const userId = String(request.data?.userId || "").trim();
    if (!userId) throw new HttpsError("invalid-argument", "userId is required.");

    const [accountSnap, entriesSnap, userSnap] = await Promise.all([
      db.collection("debug_wallet_accounts").doc(userId).get(),
      db.collection("debug_wallet_entries").where("userId", "==", userId).limit(100).get(),
      db.collection("users").doc(userId).get(),
    ]);

    const account = accountSnap.data() || {};
    const userData = userSnap.data() || {};
    const entries = entriesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? doc.data().createdAt.toDate().toISOString() : null,
    })).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return {
      userId,
      balancePaise: Number(account.balancePaise) || 0,
      lifetimeCreditPaise: Number(account.lifetimeCreditPaise) || 0,
      lifetimeDebitPaise: Number(account.lifetimeDebitPaise) || 0,
      userName: userData.name || userData.displayName || "Customer",
      userPhone: userData.phoneNumber || userData.phone || "No phone",
      entries,
    };
  });

  const getDebugOrderAdjustments = onCall(async (request) => {
    assertDebugEnvironment();
    await assertOrderManager(request.auth);
    const orderId = String(request.data?.orderId || "").trim();
    if (!orderId) throw new HttpsError("invalid-argument", "orderId is required.");

    const snapshot = await db.collection("debug_order_adjustments")
      .where("orderId", "==", orderId)
      .limit(50)
      .get();

    const adjustments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? doc.data().createdAt.toDate().toISOString() : null,
    })).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return adjustments;
  });

  return {
    getDebugWallet,
    previewDebugOrderAdjustment,
    createDebugOrderAdjustment,
    refundWalletToBank,
    listDebugWallets,
    getDebugWalletDetails,
    getDebugOrderAdjustments,
  };
};
