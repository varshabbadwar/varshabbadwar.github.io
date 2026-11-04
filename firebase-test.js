import { db, auth } from "./firebase-config.js";

import {
  collection,
  getDocs,
  limit,
  query
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    console.log("Not logged in. Please log in as admin.");
    return;
  }

  console.log("Logged in UID:", user.uid);

  try {
    const q = query(collection(db, "gallery"), limit(1));
    await getDocs(q);

    console.log("Firebase Firestore connected successfully!");

  } catch (error) {
    console.error("Firestore permission error:", error);
  }

});