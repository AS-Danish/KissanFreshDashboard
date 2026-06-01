import { create } from 'zustand';
import { getCategories, getSections } from '@/services/categoryService';
import { listenToAuthChanges } from '@/services/authService';

export const useAppStore = create((set, get) => ({
  // Auth State
  user: null,
  authLoading: true,

  initAuth: () => {
    return listenToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        set({ authLoading: true });
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const { db } = await import("@/firebase/config");
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists() && userDocSnap.data()?.role?.toUpperCase() === "ADMIN") {
            set({ user: firebaseUser, authLoading: false });
            document.cookie = "auth=true; path=/; max-age=2592000; SameSite=Lax"; // 30 days
          } else {
            const { logoutUser } = await import("@/services/authService");
            await logoutUser();
            set({ user: null, authLoading: false });
            document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
          }
        } catch (error) {
          console.error("Error verifying admin role", error);
          set({ user: null, authLoading: false });
          document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
        }
      } else {
        set({ user: null, authLoading: false });
        document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
      }
    });
  },

  // Categories State
  categories: { "home-food": [], "kissan-fresh": [] },
  sections: { "home-food": [], "kissan-fresh": [] },
  loading: false,

  fetchCategoriesAndSections: async () => {
    set({ loading: true });
    try {
      const [hfCats, kfCats, hfSecs, kfSecs] = await Promise.all([
        getCategories("home-food"),
        getCategories("kissan-fresh"),
        getSections("home-food"),
        getSections("kissan-fresh")
      ]);

      set({
        categories: {
          "home-food": hfCats,
          "kissan-fresh": kfCats
        },
        sections: {
          "home-food": hfSecs,
          "kissan-fresh": kfSecs
        },
        loading: false
      });
    } catch (error) {
      console.error("Error fetching categories and sections", error);
      set({ loading: false });
    }
  },

  refreshCategories: async () => {
    await get().fetchCategoriesAndSections();
  }
}));
