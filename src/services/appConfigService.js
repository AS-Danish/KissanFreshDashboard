import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Updates the catalog version in Firestore.
 * This triggers the mobile app to refresh its local cache.
 */
export const updateCatalogVersion = async () => {
    try {
        const versionRef = doc(db, "app_config", "versioning");
        await setDoc(versionRef, {
            catalog_status_last_updated_time: serverTimestamp()
        }, { merge: true });
        console.log("Catalog version updated successfully.");
    } catch (error) {
        console.error("Error updating catalog version:", error);
        // We don't throw here to avoid failing the main operation 
        // if only the cache-bust trigger fails, but you might want to adjust this.
    }
};
