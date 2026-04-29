import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  serverTimestamp,
  orderBy,
  writeBatch,
  onSnapshot
} from "firebase/firestore";
import { db } from "../firebase/config";
import { updateCatalogVersion } from "./appConfigService";

const CATEGORIES_COLLECTION = "categories";
const SECTIONS_COLLECTION = "sections";

/**
 * Fetch all categories of a specific type.
 * @param {string} type 'home-food' | 'kissan-fresh'
 */
export const getCategories = async (type) => {
  try {
    const categoriesRef = collection(db, CATEGORIES_COLLECTION);
    const q = query(
      categoriesRef,
      where("type", "==", type),
      orderBy("name", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates for categories of a specific type.
 * @param {string} type 'home-food' | 'kissan-fresh'
 * @param {function} callback
 */
export const subscribeToCategories = (type, callback) => {
  const categoriesRef = collection(db, CATEGORIES_COLLECTION);
  const q = query(
    categoriesRef,
    where("type", "==", type),
    orderBy("name", "asc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(categories);
  }, (error) => {
    console.error("Error subscribing to categories:", error);
  });
};

/**
 * Add a new category.
 * @param {string} name 
 * @param {string} type 'home-food' | 'kissan-fresh'
 */
export const addCategory = async (name, type) => {
  try {
    const categoriesRef = collection(db, CATEGORIES_COLLECTION);
    const docRef = await addDoc(categoriesRef, {
      name,
      type,
      createdAt: serverTimestamp()
    });
    
    // Update catalog version for cache busting
    await updateCatalogVersion();
    
    return { id: docRef.id, success: true };
  } catch (error) {
    console.error("Error adding category:", error);
    throw error;
  }
};

/**
 * Delete a category by ID.
 * @param {string} id 
 */
export const deleteCategory = async (id) => {
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    await deleteDoc(docRef);
    
    // Update catalog version for cache busting
    await updateCatalogVersion();
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};

/**
 * Fetch all sections of a specific type.
 * @param {string} type 'home-food' | 'kissan-fresh'
 */
export const getSections = async (type) => {
  try {
    const sectionsRef = collection(db, SECTIONS_COLLECTION);
    const q = query(
      sectionsRef,
      where("type", "==", type),
      orderBy("rank", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching sections:", error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates for sections of a specific type.
 * @param {string} type 'home-food' | 'kissan-fresh'
 * @param {function} callback
 */
export const subscribeToSections = (type, callback) => {
  const sectionsRef = collection(db, SECTIONS_COLLECTION);
  const q = query(
    sectionsRef,
    where("type", "==", type),
    orderBy("rank", "asc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const sections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(sections);
  }, (error) => {
    console.error("Error subscribing to sections:", error);
  });
};

/**
 * Add a new section.
 * @param {string} name 
 * @param {string} type 'home-food' | 'kissan-fresh'
 * @param {string[]} categoryNames Array of category names or IDs
 */
export const addSection = async (name, type, categories, rank) => {
  try {
    const sectionsRef = collection(db, SECTIONS_COLLECTION);
    
    // If rank is not provided, find the max rank and add 1
    let finalRank = rank;
    if (finalRank === undefined || finalRank === null) {
      const q = query(sectionsRef, where("type", "==", type), orderBy("rank", "desc"));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        finalRank = 1;
      } else {
        const lastSection = querySnapshot.docs[0].data();
        finalRank = (lastSection.rank || 0) + 1;
      }
    }

    const docRef = await addDoc(sectionsRef, {
      name,
      type,
      categories,
      rank: Number(finalRank),
      createdAt: serverTimestamp()
    });
    
    // Update catalog version for cache busting
    await updateCatalogVersion();
    
    return { id: docRef.id, success: true };
  } catch (error) {
    console.error("Error adding section:", error);
    throw error;
  }
};

/**
 * Update the rank of a section and reorder others accordingly.
 * @param {string} sectionId 
 * @param {number} newRank 
 * @param {string} type 
 */
export const updateSectionRank = async (sectionId, newRank, type) => {
  try {
    const sectionsRef = collection(db, SECTIONS_COLLECTION);
    const q = query(sectionsRef, where("type", "==", type), orderBy("rank", "asc"));
    const querySnapshot = await getDocs(q);
    
    const sections = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const targetSection = sections.find(s => s.id === sectionId);
    if (!targetSection) throw new Error("Section not found");

    const oldRank = targetSection.rank;
    if (oldRank === newRank) return { success: true };

    const batch = writeBatch(db);

    sections.forEach(section => {
      let currentRank = section.rank;
      let updatedRank = currentRank;

      if (section.id === sectionId) {
        updatedRank = newRank;
      } else {
        // Logic for shifting
        if (newRank < oldRank) {
          // If moving UP (e.g., 3 -> 1), increment others in between
          if (currentRank >= newRank && currentRank < oldRank) {
            updatedRank = currentRank + 1;
          }
        } else {
          // If moving DOWN (e.g., 1 -> 3), decrement others in between
          if (currentRank > oldRank && currentRank <= newRank) {
            updatedRank = currentRank - 1;
          }
        }
      }

      if (updatedRank !== currentRank) {
        batch.update(doc(db, SECTIONS_COLLECTION, section.id), {
          rank: Number(updatedRank)
        });
      }
    });

    await batch.commit();
    
    // Update catalog version for cache busting
    await updateCatalogVersion();
    
    return { success: true };
  } catch (error) {
    console.error("Error updating section rank:", error);
    throw error;
  }
};

/**
 * Delete a section by ID.
 * @param {string} id 
 */
export const deleteSection = async (id) => {
  try {
    const docRef = doc(db, SECTIONS_COLLECTION, id);
    await deleteDoc(docRef);
    
    // Update catalog version for cache busting
    await updateCatalogVersion();
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting section:", error);
    throw error;
  }
};
