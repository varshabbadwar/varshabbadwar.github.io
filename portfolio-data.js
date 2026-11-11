import { db } from "./firebase-config.js";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

function textValue(value, fallback = "") {
  return value === undefined || value === null ? fallback : String(value);
}

function sortNewestFirst(records) {
  return records.sort((a, b) => {
    const yearDifference = Number(b.year || 0) - Number(a.year || 0);
    if (yearDifference !== 0) return yearDifference;
    return textValue(b.date).localeCompare(textValue(a.date));
  });
}

async function loadPublishedCollection(collectionName) {
  const publishedQuery = query(
    collection(db, collectionName),
    where("published", "==", true)
  );
  const snapshot = await getDocs(publishedQuery);
  return snapshot.docs.map(document => ({
    id: document.id,
    ...document.data()
  }));
}

async function loadPortfolio() {
  const galleryCount = document.getElementById("galleryCount");

  try {
    const [galleryRecords, awardRecords] = await Promise.all([
      loadPublishedCollection("gallery"),
      loadPublishedCollection("awards")
    ]);

    const galleryItems = sortNewestFirst(galleryRecords).map(record => ({
      id: record.id,
      title: textValue(record.title, "Untitled activity"),
      year: textValue(record.year, ""),
      category: textValue(record.category, "Activity"),
      date: textValue(record.date, ""),
      image: textValue(record.imageUrl || record.image, ""),
      description: textValue(record.description, "")
    })).filter(item => item.image);

    const awards = sortNewestFirst(awardRecords).map(record => ({
      id: record.id,
      year: textValue(record.year, ""),
      title: textValue(record.title, "Achievement"),
      detail: textValue(record.detail || record.description, "")
    }));

    if (typeof window.setGalleryItems === "function") {
      window.setGalleryItems(galleryItems);
    }
    if (typeof window.setAwardsData === "function") {
      window.setAwardsData(awards);
    }

    if (galleryItems.length === 0) {
      galleryCount.textContent = "No published memories yet.";
    }
  } catch (error) {
    console.error("Unable to load portfolio data from Firestore:", error);
    galleryCount.textContent =
      "Portfolio data could not be loaded. Please try again later.";
    document.getElementById("emptyState").style.display = "block";
    document.getElementById("emptyState").querySelector("h3").textContent =
      "Unable to load memories";
    document.getElementById("emptyState").querySelector("p").textContent =
      "Please check the connection and try again later.";
  }
}

loadPortfolio();
