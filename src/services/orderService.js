import {
  doc,
  runTransaction,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  where,
  getCountFromServer,
  getAggregateFromServer,
  sum
} from "firebase/firestore";
import { db } from "../firebase/config";

const ORDERS_COLLECTION = "orders";

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
        status: "ASSIGNED", // Automatically transition if assigned
        updatedAt: new Date().toISOString()
      });
    });

    return { success: true, message: "Order successfully assigned." };
  } catch (error) {
    console.error("Assignment Transaction Failed:", error);
    throw error;
  }
};

export const getPaginatedOrders = async (pageSize = 10, lastDoc = null, statusFilter = "all") => {
  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);
    
    let queryConstraints = [];
    if (statusFilter !== "all") {
        queryConstraints.push(where("status", "==", statusFilter));
    }
    queryConstraints.push(orderBy("orderDate", "desc"));
    queryConstraints.push(limit(pageSize));

    if (lastDoc) {
      queryConstraints.push(startAfter(lastDoc));
    }

    const q = query(ordersRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    
    const orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      orders,
      lastVisible: querySnapshot.docs[querySnapshot.docs.length - 1],
      hasMore: querySnapshot.docs.length === pageSize
    };
  } catch (error) {
    console.error("Error fetching paginated orders:", error);
    throw error;
  }
};

export const getOrderStats = async () => {
  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);
    
    const assignedQuery = query(ordersRef, where("status", "==", "ASSIGNED"));
    const deliveredQuery = query(ordersRef, where("status", "==", "DELIVERED"));
    const outForDeliveryQuery = query(ordersRef, where("status", "==", "OUT FOR DELIVERY"));
    const shippedQuery = query(ordersRef, where("status", "==", "SHIPPED"));
    const [totalSnap, assignedSnap, deliveredSnap, outForDeliverySnap, shippedSnap] = await Promise.all([
      getCountFromServer(ordersRef),
      getCountFromServer(assignedQuery),
      getCountFromServer(deliveredQuery),
      getCountFromServer(outForDeliveryQuery),
      getCountFromServer(shippedQuery),
    ]);
    const totalOrders = totalSnap.data().count;
    const assignedOrders = assignedSnap.data().count;
    const deliveredOrders = deliveredSnap.data().count;
    const shippedOrders = outForDeliverySnap.data().count + shippedSnap.data().count;

    let grossRevenue = 0;
    try {
        const revenueSnap = await getAggregateFromServer(ordersRef, {
            totalRevenue: sum('totalAmount')
        });
        grossRevenue = revenueSnap.data().totalRevenue || 0;
        
    } catch (e) {
        console.warn("Aggregate sum failed:", e);
    }

    return {
        totalOrders,
        assignedOrders,
        shippedOrders,
        deliveredOrders,
        grossRevenue
    };
  } catch (error) {
    console.error("Error fetching order stats:", error);
    return { totalOrders: 0, assignedOrders: 0, shippedOrders: 0, deliveredOrders: 0, grossRevenue: 0 };
  }
};

export const getChartData = async (days = 90) => {
  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);
    
    // Fetch recent 1000 orders to aggregate
    const q = query(ordersRef, orderBy("orderDate", "desc"), limit(1000));
    const querySnapshot = await getDocs(q);
    
    const aggregated = {};
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.orderDate) return;
      
      let d;
      if (data.orderDate.toDate) d = data.orderDate.toDate();
      else d = new Date(data.orderDate);
      
      const dateStr = d.toISOString().split('T')[0];
      if (!aggregated[dateStr]) {
        aggregated[dateStr] = { revenue: 0, orders: 0 };
      }
      aggregated[dateStr].revenue += (Number(data.totalAmount) || 0);
      aggregated[dateStr].orders += 1;
    });
    
    // Fill missing dates
    const result = [];
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        revenue: aggregated[dateStr]?.revenue || 0,
        orders: aggregated[dateStr]?.orders || 0,
      });
    }
    
    return result;
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return [];
  }
};

export const getOrdersByDateRange = async (startDate, endDate) => {
  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);
    
    // We fetch all orders within range. Using orderBy and filter.
    // If we don't have composite indexes, we might need to fetch and filter,
    // but typically we can do a query with where on a single field and then filter or sort in memory if needed.
    // Assuming orderDate is stored as an ISO string or Timestamp.
    
    // Simplest approach without complex indexes:
    // We just get them ordered by orderDate descending, and fetch until we hit the start date.
    // But for a Sales Report, getting all might be fine if there aren't millions of orders per month.
    // Let's do a simple query where orderDate >= startDate and <= endDate.
    const q = query(
        ordersRef, 
        where("orderDate", ">=", startDate),
        where("orderDate", "<=", endDate),
        orderBy("orderDate", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching orders by date range:", error);
    throw error;
  }
};
