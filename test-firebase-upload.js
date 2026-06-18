import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadString } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCnVhCJf5GsXh3Txj5rV_a4qW-sMkUnonA",
  authDomain: "expense-claim-management.firebaseapp.com",
  projectId: "expense-claim-management",
  storageBucket: "expense-claim-management.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const storageRef = ref(storage, "test/test.txt");

uploadString(storageRef, "hello world").then(() => {
  console.log("Upload successful!");
  process.exit(0);
}).catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
