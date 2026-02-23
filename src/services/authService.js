import { auth } from "@/firebase/config";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

export const loginUser = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = () => {
  return signOut(auth);
};

export const listenToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};