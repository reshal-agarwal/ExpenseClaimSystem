import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCnVhCJf5GsXh3Txj5rV_a4qW-sMkUnonA",
  authDomain: "expense-claim-management.firebaseapp.com",
  projectId: "expense-claim-management",
  storageBucket: "expense-claim-management.firebasestorage.app",
  messagingSenderId: "978631756202",
  appId: "1:978631756202:web:99a6ae3287a96177fcc3d3",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);