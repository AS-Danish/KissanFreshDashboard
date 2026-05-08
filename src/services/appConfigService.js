import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
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
    }
};

/**
 * Fetches the themes from the app_config/versioning document.
 * Returns an array of themes, or default ones if not found.
 */
export const fetchThemes = async () => {
    try {
        const versionRef = doc(db, "app_config", "versioning");
        const docSnap = await getDoc(versionRef);
        
        const defaultThemes = [
            { "Normal": true, imageURL: "" },
            { "Eid": false, imageURL: "" },
            { "Bakra Eid": false, imageURL: "" },
            { "Ramazan": false, imageURL: "" },
            { "Christmas": false, imageURL: "" }
        ];

        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.themes && Array.isArray(data.themes)) {
                // Merge with default themes in case new themes were added
                return defaultThemes.map(dt => {
                    const dtName = Object.keys(dt).find(k => k !== "imageURL");
                    const existing = data.themes.find(t => Object.keys(t).includes(dtName));
                    return existing ? { ...dt, ...existing } : dt;
                });
            }
        }
        return defaultThemes;
    } catch (error) {
        console.error("Error fetching themes:", error);
        throw error;
    }
};

/**
 * Updates the themes array in the app_config/versioning document.
 * @param {Array} themes 
 */
export const updateThemes = async (themes) => {
    try {
        const versionRef = doc(db, "app_config", "versioning");
        await setDoc(versionRef, {
            themes: themes
        }, { merge: true });
        console.log("Themes updated successfully.");
    } catch (error) {
        console.error("Error updating themes:", error);
        throw error;
    }
};
