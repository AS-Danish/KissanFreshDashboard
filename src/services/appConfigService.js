import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

export const THEME_COLOR_FIELDS = [
    "primary",
    "accent",
    "background",
    "surface",
    "success",
    "error",
];

const normalColors = {
    primary: "#14B8A6",
    accent: "#F59E0B",
    background: "#F5FFFE",
    surface: "#FFFFFF",
    success: "#16A34A",
    error: "#DC2626",
};

const themeDefaults = [
    { "Normal": true, imageURL: "", colors: normalColors },
    { "Eid": false, imageURL: "", colors: { ...normalColors, primary: "#059669", accent: "#D4AF37", background: "#F0FDF4" } },
    { "Bakra Eid": false, imageURL: "", colors: { ...normalColors, primary: "#047857", accent: "#D97706", background: "#F0FDF4" } },
    { "Ramazan": false, imageURL: "", colors: { ...normalColors, primary: "#6D28D9", accent: "#F59E0B", background: "#FAF5FF" } },
    { "Christmas": false, imageURL: "", colors: { ...normalColors, primary: "#2563EB", accent: "#DC2626", background: "#EFF6FF" } },
];

export const getThemeName = (theme) =>
    Object.keys(theme).find((key) => key !== "imageURL" && key !== "colors");

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
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.themes && Array.isArray(data.themes)) {
                // Merge with default themes in case new themes were added
                return themeDefaults.map(dt => {
                    const dtName = getThemeName(dt);
                    const existing = data.themes.find(t => Object.keys(t).includes(dtName));
                    return existing
                        ? { ...dt, ...existing, colors: { ...dt.colors, ...existing.colors } }
                        : dt;
                });
            }
        }
        return themeDefaults;
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
            themes: themes,
            header_status_update_time: serverTimestamp()
        }, { merge: true });
        console.log("Themes updated successfully.");
    } catch (error) {
        console.error("Error updating themes:", error);
        throw error;
    }
};
