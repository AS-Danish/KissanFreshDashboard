import { collection, query, orderBy, limit, startAfter, getDocs, where } from "firebase/firestore";
import { db } from "../firebase/config";

const PRODUCTS_COLLECTION = "products";

/**
 * Fetch paginated products from Firestore.
 * @param {string} type 'home-food' | 'kissan-fresh'
 * @param {number} pageSize Number of items per page
 * @param {object} lastDoc The last document from the previous page (for pagination)
 * @param {object} filters Object containing category, price, tag filters
 */
export const getPaginatedProducts = async (type, pageSize = 10, lastDoc = null, filters = {}) => {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    
    let queryConstraints = [
      where("productOrigin", "==", type), // Ensure correct product type
      orderBy("createdAt", "desc"),
      limit(pageSize)
    ];

    // Note: Complex filtering alongside pagination in Firebase requires composite indexes.
    // Assuming category and tag filters are applied if present:
    if (filters.category && filters.category !== "all") {
       queryConstraints = [
          where("productOrigin", "==", type),
          where("category", "==", filters.category),
          orderBy("createdAt", "desc"),
          limit(pageSize)
       ];
    }
    
    // We cannot easily filter by multiple fields without indexes, 
    // but we add startAfter if lastDoc is provided for pagination
    if (lastDoc) {
      queryConstraints.push(startAfter(lastDoc));
    }

    const q = query(productsRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    
    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      products,
      lastVisible: querySnapshot.docs[querySnapshot.docs.length - 1],
      hasMore: querySnapshot.docs.length === pageSize
    };
  } catch (error) {
    console.error("Error fetching paginated products:", error);
    throw error;
  }
};
