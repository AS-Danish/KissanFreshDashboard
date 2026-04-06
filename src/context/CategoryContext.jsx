"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { subscribeToCategories, subscribeToSections } from "@/services/categoryService";

const CategoryContext = createContext();

export const CategoryProvider = ({ children }) => {
  const [categories, setCategories] = useState({ "home-food": [], "kissan-fresh": [] });
  const [sections, setSections] = useState({ "home-food": [], "kissan-fresh": [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Single subscription for each type
    const unsubHfCats = subscribeToCategories("home-food", (cats) => {
      setCategories(prev => ({ ...prev, "home-food": cats }));
    });

    const unsubKfCats = subscribeToCategories("kissan-fresh", (cats) => {
      setCategories(prev => ({ ...prev, "kissan-fresh": cats }));
    });

    const unsubHfSecs = subscribeToSections("home-food", (secs) => {
      setSections(prev => ({ ...prev, "home-food": secs }));
    });

    const unsubKfSecs = subscribeToSections("kissan-fresh", (secs) => {
      setSections(prev => ({ ...prev, "kissan-fresh": secs }));
      setLoading(false); // Assume both types are loaded when the second one returns
    });

    return () => {
      unsubHfCats();
      unsubKfCats();
      unsubHfSecs();
      unsubKfSecs();
    };
  }, []);

  const value = {
    categories,
    sections,
    loading,
    refreshCategories: () => {
        // Technically not needed with onSnapshot, but helpful for manual triggers if any
    }
  };

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategory = () => {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error("useCategory must be used within a CategoryProvider");
  }
  return context;
};
