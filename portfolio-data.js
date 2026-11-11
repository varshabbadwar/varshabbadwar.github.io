import { db } from './firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

async function loadPublished(collectionName) {
  const q = query(collection(db, collectionName), where('published', '==', true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadPortfolio() {
  try {
    const [gallery, awards] = await Promise.all([
      loadPublished('gallery'),
      loadPublished('awards')
    ]);

    if (gallery.length && typeof window.setGalleryItems === 'function') {
      window.setGalleryItems(gallery.map(item => ({
        ...item,
        image: item.imageUrl || item.image || '',
        date: item.date || String(item.year || '')
      })));
    }
    if (awards.length && typeof window.setAwardsData === 'function') {
      window.setAwardsData(awards);
    }
  } catch (error) {
    console.error('Unable to load published portfolio content from Firestore:', error);
    const status = document.getElementById('portfolioDataStatus');
    if (status) status.textContent = 'Some portfolio content could not be loaded. Please try again later.';
  }
}

loadPortfolio();
