import { initializeApp } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import { getFirestore } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA9nS3arYv6jeKNhD-WStHLoa8jcUnsO9k",
  authDomain: "varshabbadwar-portfolio.firebaseapp.com",
  projectId: "varshabbadwar-portfolio",
  storageBucket: "varshabbadwar-portfolio.firebasestorage.app",
  messagingSenderId: "573257768168",
  appId: "1:573257768168:web:94c7cacb0caa469c697d5d",
  measurementId: "G-TG9VX3G1NP"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);