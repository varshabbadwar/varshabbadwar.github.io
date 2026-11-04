import { db } from "./firebase-config.js";

import {
  collection,
  getDocs,
  limit,
  query
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

async function testFirebase() {
  try {
    const q = query(collection(db, "gallery"), limit(1));
    await getDocs(q);

    console.log("Firebase Firestore connected successfully!");
  } catch (error) {
    console.error("Firebase connection failed:", error);
  }
}

testFirebase();