import { create } from 'zustand';
import { getCategories, getSections } from '@/services/categoryService';
import { listenToAuthChanges } from '@/services/authService';

export const useAppStore = create((set, get) => ({
  // Auth State
  user: null,
  authLoading: true,

  initAuth: () => {
    return listenToAuthChanges((firebaseUser) => {
      set({ user: firebaseUser, authLoading: false });
      if (firebaseUser) {
        document.cookie = "auth=true; path=/; max-age=2592000; SameSite=Lax"; // 30 days
      } else {
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
