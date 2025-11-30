import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Helper to safely get env vars if they exist, otherwise undefined
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

// Hardcoded keys as primary, falling back to env vars if available, then placeholders.
// This ensures it works in the browser even if process is undefined.
const firebaseConfig = {
  apiKey: "AIzaSyDV6ZZUoY-Amb418SCFRmNs3dojL8Ujfmg", // As provided in your prompt
  authDomain: "sonora-ranking.firebaseapp.com",
  projectId: "sonora-ranking",
  storageBucket: "sonora-ranking.firebasestorage.app",
  messagingSenderId: "284691479646",
  appId: "1:284691479646:web:30848fcd0f46950c8808cf"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Sign In Error", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error", error);
  }
};