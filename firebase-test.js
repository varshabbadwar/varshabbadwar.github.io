import { db } from "./firebase-config.js";

import {
  collection,
  getDocs,
  limit,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

async function testFirebase() {
  try {
    // Only request published gallery documents
    const q = query(
      collection(db, "gallery"),
      where("published", "==", true),
      limit(1)
    );

    const snapshot = await getDocs(q);

    console.log("Firebase Firestore connected successfully!");
    console.log("Published gallery documents:", snapshot.size);

  } catch (error) {
    console.error("Firebase connection failed:", error.code, error.message);
  }
}

testFirebase();