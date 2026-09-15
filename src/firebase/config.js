import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (
  process.env.NEXT_PUBLIC_APP_ENV === "debug" &&
  (!firebaseConfig.projectId || firebaseConfig.projectId === "kissanfresh-a72c1")
) {
  throw new Error("Debug dashboard cannot connect to the production Firebase project.");
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

let messagingPromise;

async function getMessagingInstance() {
  if (typeof window === "undefined") return null;

  if (!messagingPromise) {
    messagingPromise = import("firebase/messaging").then(async ({ getMessaging, isSupported }) => {
      return (await isSupported()) ? getMessaging(app) : null;
    });
  }

  return messagingPromise;
}

export { app, auth, db, storage, functions, getMessagingInstance };
