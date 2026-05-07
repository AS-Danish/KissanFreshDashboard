const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const CATEGORIES = [
  // --- Kissan Fresh (Groceries) ---
  {name: "Fresh Vegetables", type: "kissan-fresh"},
  {name: "Exotic Fruits", type: "kissan-fresh"},
  {name: "Farm Dairy", type: "kissan-fresh"},
  {name: "Poultry & Meat", type: "kissan-fresh"},
  {name: "Spices & Pantry", type: "kissan-fresh"},
  {name: "Organic Grains", type: "kissan-fresh"},
  {name: "Beverages & Juices", type: "kissan-fresh"},

  // --- Home Food ---
  {name: "Traditional Thalis", type: "home-food"},
  {name: "Biryani & Rice", type: "home-food"},
  {name: "North Indian Curries", type: "home-food"},
  {name: "South Indian Specialties", type: "home-food"},
  {name: "Tandoor & Starters", type: "home-food"},
  {name: "Traditional Sweets", type: "home-food"},
  {name: "Street Food Snacks", type: "home-food"},
];

const PRODUCTS = [
  // --- Kissan Fresh (Groceries) ---
  {
    name: "Organic Vine-Ripened Tomatoes",
    description: "Farm-fresh, pesticide-free red tomatoes grown organically for the best flavor.",
    category: "Fresh Vegetables",
    unit: "kg",
    unitValue: 1,
    price: 40,
    tags: ["100% Organic", "Fresh", "Farm-to-table"],
    images: ["https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg"],
    inStock: true,
    productOrigin: "kissan-fresh",
    stockCount: 50,
  },
  {
    name: "Premium Alphonso Mangoes",
    description: "Hand-picked, naturally ripened Alphonso mangoes from Devgad. King of Mangoes.",
    category: "Exotic Fruits",
    unit: "Dozen",
    unitValue: 1,
    price: 800,
    tags: ["Fresh", "Locally Sourced"],
    images: [
      "https://images.pexels.com/photos/2294477/pexels-photo-2294477.jpeg",
      "https://images.pexels.com/photos/616833/pexels-photo-616833.jpeg",
    ],
    inStock: true,
    productOrigin: "kissan-fresh",
    stockCount: 20,
  },
  {
    name: "Pure A2 Cow Milk",
    description: "Pure, pasteurized whole milk from grass-fed cows. Delivered fresh daily.",
    category: "Farm Dairy",
    unit: "Litre",
    unitValue: 1,
    price: 85,
    tags: ["Fresh", "Pure", "Organic"],
    images: ["https://images.pexels.com/photos/248412/pexels-photo-248412.jpeg"],
    inStock: true,
    productOrigin: "kissan-fresh",
    stockCount: 100,
  },
  {
    name: "Cleaned Chicken Breast (Skinless)",
    description: "High-protein, skinless chicken breast cleaned and ready for cooking.",
    category: "Poultry & Meat",
    unit: "kg",
    unitValue: 1,
    price: 320,
    tags: ["Fresh", "High-Protein"],
    images: ["https://images.pexels.com/photos/616327/pexels-photo-616327.jpeg"],
    inStock: true,
    productOrigin: "kissan-fresh",
    stockCount: 15,
  },
  {
    name: "Natural Kandahari Pomegranate",
    description: "Deep red, sweet and juicy pomegranate rubies. Packed with antioxidants.",
    category: "Exotic Fruits",
    unit: "kg",
    unitValue: 1,
    price: 220,
    tags: ["Fresh", "Healthy"],
    images: ["https://images.pexels.com/photos/1590111/pexels-photo-1590111.jpeg"],
    inStock: true,
    productOrigin: "kissan-fresh",
    stockCount: 40,
  },
  {
    name: "Cold-Pressed Desi Ghee",
    description: "Traditional Bilona method cow ghee with rich aroma and granular texture.",
    category: "Farm Dairy",
    unit: "ml",
    unitValue: 500,
    price: 650,
    tags: ["100% Organic", "Pure", "Traditional"],
    images: ["https://images.pexels.com/photos/8105151/pexels-photo-8105151.jpeg"],
    inStock: true,
    productOrigin: "kissan-fresh",
    stockCount: 30,
  },
  {
    name: "Pure Turmeric Powder",
    description: "Salem turmeric grounded at low temperature to retain curcumin content.",
    category: "Spices & Pantry",
    unit: "gm",
    unitValue: 200,
    price: 90,
    tags: ["100% Organic", "Pure"],
    images: ["https://images.pexels.com/photos/674483/pexels-photo-674483.jpeg"],
    inStock: true,
    productOrigin: "kissan-fresh",
    stockCount: 100,
  },
  {
    name: "Traditional Basmati Rice",
    description: "Extra long grain aged basmati rice with exquisite aroma and fluffy texture.",
    category: "Organic Grains",
    unit: "kg",
    unitValue: 5,
    price: 750,
    tags: ["100% Organic", "Premium"],
    images: ["https://images.pexels.com/photos/4110255/pexels-photo-4110255.jpeg"],
    inStock: true,
    productOrigin: "kissan-fresh",
    stockCount: 25,
  },
  {
    name: "Farm Fresh Brown Eggs (6pcs)",
    description: "Nutritious brown eggs from free-range country chickens.",
    category: "Farm Dairy",
    unit: "Pack",
    unitValue: 1,
    price: 110,
    tags: ["Fresh", "Natural"],
    images: ["https://images.pexels.com/photos/162712/egg-white-food-shell-162712.jpeg"],
    inStock: true,
    productOrigin: "kissan-fresh",
    stockCount: 40,
  },
  {
    name: "Alphonso Mango Pulp (Tin)",
    description: "100% natural mango pulp with no added sugar or preservatives.",
    category: "Beverages & Juices",
    unit: "gm",
    unitValue: 850,
    price: 320,
    tags: ["Natural", "Pure"],
    images: ["https://images.pexels.com/photos/616833/pexels-photo-616833.jpeg"],
    inStock: true,
    productOrigin: "kissan-fresh",
    stockCount: 35,
  },

  // --- Home Food ---
  {
    name: "Maharaja Veg Thali",
    description: "Complete royal meal: 2 curries, Dal Makhani, Pulao, 3 Butter Rotis, and Gulab Jamun.",
    category: "Traditional Thalis",
    unit: "Plate",
    unitValue: 1,
    price: 250,
    tags: ["Homemade", "Authentic", "Healthy"],
    images: [
      "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg",
      "https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg",
    ],
    inStock: true,
    productOrigin: "home-food",
    stockCount: 15,
  },
  {
    name: "Hyderabadi Chicken Biryani",
    description: "Authentic dum biryani layered with long-grain rice and succulent chicken. Served with raita.",
    category: "Biryani & Rice",
    unit: "Plate",
    unitValue: 1,
    price: 350,
    tags: ["Homemade", "Authentic", "Spicy"],
    images: [
      "https://images.pexels.com/photos/12737651/pexels-photo-12737651.jpeg",
      "https://images.pexels.com/photos/10106511/pexels-photo-10106511.jpeg",
    ],
    inStock: true,
    productOrigin: "home-food",
    stockCount: 10,
  },
  {
    name: "Butter Chicken (Classic)",
    description: "Smoky tandoori chicken cooked in a rich, buttery tomato cream sauce.",
    category: "North Indian Curries",
    unit: "Bowl",
    unitValue: 1,
    price: 380,
    tags: ["Homemade", "Authentic", "Rich"],
    images: ["https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg"],
    inStock: true,
    productOrigin: "home-food",
    stockCount: 12,
  },
  {
    name: "Classic Paneer Butter Masala",
    description: "Soft cottage cheese cubes in a mildly sweet and spicy tomato gravy.",
    category: "North Indian Curries",
    unit: "Bowl",
    unitValue: 1,
    price: 320,
    tags: ["Homemade", "Healthy", "Vegetarian"],
    images: ["https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
    inStock: true,
    productOrigin: "home-food",
    stockCount: 18,
  },
  {
    name: "Masala Dosa Combo",
    description: "Crispy fermented rice pancake filled with spiced potato. Served with Sambar and Chutney.",
    category: "South Indian Specialties",
    unit: "Plate",
    unitValue: 1,
    price: 180,
    tags: ["Homemade", "Traditional", "Healthy"],
    images: ["https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg"],
    inStock: true,
    productOrigin: "home-food",
    stockCount: 20,
  },
  {
    name: "Assorted Tandoori Platter",
    description: "Platter containing Paneer Tikka, Veg Seekh Kebab, and Tandoori Mushrooms.",
    category: "Tandoor & Starters",
    unit: "Plate",
    unitValue: 1,
    price: 450,
    tags: ["Homemade", "Tandoor", "Protein-Packed"],
    images: [
      "https://images.pexels.com/photos/10106511/pexels-photo-10106511.jpeg",
      "https://images.pexels.com/photos/12737651/pexels-photo-12737651.jpeg",
    ],
    inStock: true,
    productOrigin: "home-food",
    stockCount: 8,
  },
  {
    name: "Paneer Tikka (8pcs)",
    description: "Marinated cottage cheese cubes grilled to perfection with onions and bell peppers.",
    category: "Tandoor & Starters",
    unit: "Plate",
    unitValue: 1,
    price: 280,
    tags: ["Homemade", "Traditional", "Vegetarian"],
    images: ["https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
    inStock: true,
    productOrigin: "home-food",
    stockCount: 15,
  },
  {
    name: "Dal Makhani (Slow Cooked)",
    description: "Black lentils slow-cooked overnight with cream and butter for ultimate richness.",
    category: "North Indian Curries",
    unit: "Bowl",
    unitValue: 1,
    price: 240,
    tags: ["Homemade", "Traditional", "Healthy"],
    images: ["https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
    inStock: true,
    productOrigin: "home-food",
    stockCount: 20,
  },
  {
    name: "Crispy Veg Samosas (4pcs)",
    description: "Hand-folded crispy pastries filled with spiced green peas and potatoes.",
    category: "Street Food Snacks",
    unit: "Plate",
    unitValue: 1,
    price: 110,
    tags: ["Homemade", "Preservative-free", "Spicy"],
    images: ["https://images.pexels.com/photos/4441065/pexels-photo-4441065.jpeg"],
    inStock: true,
    productOrigin: "home-food",
    stockCount: 30,
  },
  {
    name: "Special Gulab Jamun (4pcs)",
    description: "Berry-sized balls made of milk solids, deep-fried and soaked in cardamom syrup.",
    category: "Traditional Sweets",
    unit: "Box",
    unitValue: 1,
    price: 160,
    tags: ["Homemade", "Traditional", "Mom's Recipe"],
    images: ["https://images.pexels.com/photos/14068564/pexels-photo-14068564.jpeg"],
    inStock: true,
    productOrigin: "home-food",
    stockCount: 25,
  },
  {
    name: "Creamy Mango Lassi",
    description: "Refreshing yogurt-based drink blended with real Alphonso mango pulp.",
    category: "Street Food Snacks",
    unit: "Glass",
    unitValue: 1,
    price: 90,
    tags: ["Homemade", "Authentic", "Healthy"],
    images: ["https://images.pexels.com/photos/616833/pexels-photo-616833.jpeg"],
    inStock: true,
    productOrigin: "home-food",
    stockCount: 50,
  },
];

async function populate() {
  console.log("🚀 Starting expanded database population...");

  try {
    // 1. Add Categories
    console.log("\n📦 Adding Categories...");
    for (const cat of CATEGORIES) {
      const existing = await db.collection("categories")
          .where("name", "==", cat.name)
          .where("type", "==", cat.type)
          .get();

      if (existing.empty) {
        await db.collection("categories").add({
          ...cat,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Category: ${cat.name} (${cat.type})`);
      } else {
        console.log(`ℹ️ Exists: ${cat.name}`);
      }
    }

    // 2. Add Products
    console.log("\n🥘 Adding Products...");
    for (const prod of PRODUCTS) {
      const existing = await db.collection("products")
          .where("name", "==", prod.name)
          .get();

      if (existing.empty) {
        await db.collection("products").add({
          ...prod,
          createdAt: new Date().toISOString(),
        });
        console.log(`✅ Product: ${prod.name}`);
      } else {
        console.log(`ℹ️ Exists: ${prod.name}`);
      }
    }

    console.log("\n✨ Database expanded successfully with over 20+ real items!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error populating database:", err);
    process.exit(1);
  }
}

populate();
