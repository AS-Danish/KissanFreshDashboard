import "dotenv/config";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import algoliasearch from "algoliasearch";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const client = algoliasearch(
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID, 
    process.env.NEXT_PUBLIC_ALGOLIA_ADMIN_API_KEY
);
const index = client.initIndex("products");

async function sync() {
    console.log("Fetching products from Firestore...");
    const snapshot = await getDocs(collection(db, "products"));
    const records = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        records.push({
            objectID: doc.id,
            name: data.name,
            description: data.description,
            category: data.category,
            price: data.price,
            mrp: data.mrp,
            discountPercentage: data.discountPercentage,
            image: data.images && data.images.length > 0 ? data.images[0] : null,
            productOrigin: data.productOrigin,
            inStock: data.inStock,
            tags: data.tags,
            hasVariations: data.hasVariations,
            unit: data.unit,
            unitValue: data.unitValue
        });
    });

    console.log(`Found ${records.length} products. Uploading to Algolia...`);
    
    if (records.length > 0) {
        await index.saveObjects(records);
        console.log("Successfully synced all products to Algolia!");
    } else {
        console.log("No products to sync.");
    }
    process.exit(0);
}

sync().catch(err => {
    console.error("Error syncing:", err);
    process.exit(1);
});
