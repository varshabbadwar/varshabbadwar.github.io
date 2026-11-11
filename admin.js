
import { auth, db } from './firebase-config.js';

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const ADMIN_UID = 'Iv50JJ7KrNeREMftM70eqGmOWYJ3';

// Replace with your actual deployed Cloudflare Worker URL
const WORKER_URL = 'https://REPLACE-WITH-YOUR-WORKER.workers.dev';

const $ = id => document.getElementById(id);

let activeType = 'gallery';
let currentUser = null;

// Existing photographs retained from Firestore
let existingImageUrls = [];

// Newly selected photographs
let selectedFiles = [];

// Temporary preview URLs
let previewObjectUrls = [];

function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}

function revokePreviewUrls() {
  previewObjectUrls.forEach(url => URL.revokeObjectURL(url));
  previewObjectUrls = [];
}

function resetForm() {
  revokePreviewUrls();

  $('contentForm').reset();

  $('docId').value = '';
  $('year').value = new Date().getFullYear();
  $('published').checked = true;

  $('imageFile').value = '';

  existingImageUrls = [];
  selectedFiles = [];

  $('previewGrid').innerHTML = '';

  $('saveBtn').textContent = 'Upload & Save';
}

function setType(type) {
  activeType = type;

  $('recordType').value = type;

  document.querySelectorAll('.tabs button').forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.tab === type
    );
  });

  $('categoryWrap').classList.toggle(
    'hidden',
    type === 'awards'
  );

  $('dateWrap').classList.toggle(
    'hidden',
    type === 'awards'
  );

  // Photograph upload is enabled for both sections
  $('imageWrap').classList.remove('hidden');

  $('detailLabel').querySelector('label').textContent =
    type === 'awards' ? 'Details *' : 'Description *';

  $('listTitle').textContent =
    type === 'awards' ? 'Awards' : 'Gallery entries';

  resetForm();
  loadRecords();
}


// ========================================
// MULTIPLE PHOTOGRAPH PREVIEW
// ========================================

function renderPreviews() {
  revokePreviewUrls();

  const grid = $('previewGrid');
  grid.innerHTML = '';

  // Existing photographs
  existingImageUrls.forEach((url, index) => {
    const card = createPhotoCard(
      url,
      `Existing photo ${index + 1}`,
      () => {
        existingImageUrls.splice(index, 1);
        renderPreviews();
      }
    );

    grid.appendChild(card);
  });

  // Newly selected photographs
  selectedFiles.forEach((file, index) => {
    const objectUrl = URL.createObjectURL(file);
    previewObjectUrls.push(objectUrl);

    const card = createPhotoCard(
      objectUrl,
      file.name,
      () => {
        selectedFiles.splice(index, 1);
        updateFileInput();
        renderPreviews();
      }
    );

    grid.appendChild(card);
  });
}

function createPhotoCard(imageUrl, name, onRemove) {
  const card = document.createElement('div');
  card.className = 'photo-card';

  const image = document.createElement('img');
  image.src = imageUrl;
  image.alt = name;

  const fileName = document.createElement('small');
  fileName.textContent = name;

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'danger';
  removeButton.textContent = 'Remove';
  removeButton.onclick = onRemove;

  card.append(image, fileName, removeButton);

  return card;
}

function updateFileInput() {
  const dataTransfer = new DataTransfer();

  selectedFiles.forEach(file => {
    dataTransfer.items.add(file);
  });

  $('imageFile').files = dataTransfer.files;
}


// ========================================
// GITHUB IMAGE UPLOAD
// ========================================

async function uploadImage(file) {
  if (!file) return null;

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      `${file.name}: Choose JPG, PNG or WebP.`
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error(
      `${file.name}: Image must be 5 MB or smaller.`
    );
  }

  if (WORKER_URL.includes('REPLACE-WITH')) {
    throw new Error(
      'Cloudflare Worker URL is not configured.'
    );
  }

  const token = await currentUser.getIdToken();

  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(
        String(reader.result).split(',')[1]
      );
    };

    reader.onerror = () => reject(
      new Error(`Could not read ${file.name}`)
    );

    reader.readAsDataURL(file);
  });

  const safeName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-90);

  // Unique filename to avoid overwriting another photo
  const uniqueName =
    `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;

  const response = await fetch(`${WORKER_URL}/upload`, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },

    body: JSON.stringify({
      fileName: uniqueName,
      contentType: file.type,
      contentBase64: base64,
      year: $('year').value,
      category: activeType
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error || `Upload failed for ${file.name}`
    );
  }

  if (!result.imageUrl) {
    throw new Error(
      `Worker did not return an image URL for ${file.name}.`
    );
  }

  return result.imageUrl;
}


// ========================================
// SAVE GALLERY / AWARD RECORD
// ========================================

async function saveRecord(event) {
  event.preventDefault();

  if (!currentUser || currentUser.uid !== ADMIN_UID) {
    return;
  }

  $('saveBtn').disabled = true;

  try {
    const uploadedUrls = [...existingImageUrls];

    // Upload each newly selected photograph
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      status(
        `Uploading photograph ${i + 1} of ${selectedFiles.length}...`
      );

      const imageUrl = await uploadImage(file);

      uploadedUrls.push(imageUrl);
    }

    if (uploadedUrls.length === 0) {
      throw new Error(
        'Please select at least one photograph.'
      );
    }

    status('Saving record to Firestore...');

    const data = {
      title: $('title').value.trim(),

      year: String($('year').value),

      detail: $('description').value.trim(),

      description: $('description').value.trim(),

      // Multiple photographs
      imageUrls: uploadedUrls,

      // Backward compatibility with existing website code
      imageUrl: uploadedUrls[0],
      image: uploadedUrls[0],

      published: $('published').checked,

      updatedAt: serverTimestamp()
    };

    if (activeType === 'gallery') {
      data.category = $('category').value;
      data.date = $('date').value;
    }

    const id = $('docId').value;

    if (id) {
      await updateDoc(
        doc(db, activeType, id),
        data
      );
    } else {
      await addDoc(
        collection(db, activeType),
        {
          ...data,
          createdAt: serverTimestamp()
        }
      );
    }

    status(
      activeType === 'gallery'
        ? 'Gallery entry saved successfully.'
        : 'Award saved successfully.'
    );

    resetForm();

    await loadRecords();

  } catch (error) {
    console.error(error);

    status(
      error.message || 'Unable to save record.',
      true
    );

  } finally {
    $('saveBtn').disabled = false;
  }
}


// ========================================
// LOAD RECORDS
// ========================================

async function loadRecords() {
  if (!currentUser) return;

  $('records').textContent = 'Loading...';

  try {
    const snapshot = await getDocs(
      query(
        collection(db, activeType),
        orderBy('createdAt', 'desc')
      )
    );

    $('records').innerHTML = '';

    if (snapshot.empty) {
      $('records').textContent = 'No records yet.';
      return;
    }

    snapshot.forEach(snapshotDoc => {
      const data = snapshotDoc.data();

      const item = document.createElement('div');
      item.className = 'item';

      const info = document.createElement('div');

      const title = document.createElement('strong');
      title.textContent = data.title || 'Untitled';

      const meta = document.createElement('small');

      const photos = data.imageUrls ||
        (data.imageUrl || data.image
          ? [data.imageUrl || data.image]
          : []);

      meta.textContent =
        `${data.year || ''} · ` +
        `${data.published ? 'Published' : 'Draft'} · ` +
        `${photos.length} photo(s)`;

      info.append(title, meta);

      const actions = document.createElement('div');
      actions.className = 'row';

      const edit = document.createElement('button');
      edit.className = 'secondary';
      edit.textContent = 'Edit';

      edit.onclick = () => {
        editRecord(snapshotDoc.id, data);
      };

      const remove = document.createElement('button');
      remove.className = 'danger';
      remove.textContent = 'Delete';

      remove.onclick = () => {
        removeRecord(snapshotDoc.id, data.title);
      };

      actions.append(edit, remove);

      item.append(info, actions);

      $('records').appendChild(item);
    });

  } catch (error) {
    console.error(error);

    $('records').textContent =
      'Could not load records: ' + error.message;
  }
}


// ========================================
// EDIT RECORD
// ========================================

function editRecord(id, data) {
  $('docId').value = id;

  $('title').value = data.title || '';

  $('year').value =
    data.year || new Date().getFullYear();

  $('description').value =
    data.description || data.detail || '';

  $('published').checked = !!data.published;

  if (activeType === 'gallery') {
    $('category').value =
      data.category || 'Other';

    $('date').value = data.date || '';
  }

  // Support both old single-photo records
  // and new multiple-photo records
  existingImageUrls = Array.isArray(data.imageUrls)
    ? [...data.imageUrls]
    : (data.imageUrl || data.image
        ? [data.imageUrl || data.image]
        : []);

  selectedFiles = [];

  $('imageFile').value = '';

  renderPreviews();

  $('saveBtn').textContent = 'Update record';

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


// ========================================
// DELETE RECORD
// ========================================

async function removeRecord(id, title) {
  if (!confirm(
    `Delete "${title}" from Firestore? ` +
    'GitHub photographs will remain for safety.'
  )) {
    return;
  }

  try {
    await deleteDoc(
      doc(db, activeType, id)
    );

    status(
      'Record deleted. GitHub photographs were retained.'
    );

    await loadRecords();

  } catch (error) {
    status(error.message, true);
  }
}


// ========================================
// AUTHENTICATION
// ========================================

$('loginBtn').onclick = async () => {
  $('loginMessage').textContent = 'Signing in...';

  try {
    await signInWithEmailAndPassword(
      auth,
      $('email').value.trim(),
      $('password').value
    );

  } catch (error) {
    $('loginMessage').textContent = error.message;
  }
};

$('logoutBtn').onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  currentUser = user;

  if (user && user.uid === ADMIN_UID) {
    $('loginPanel').classList.add('hidden');
    $('appPanel').classList.remove('hidden');
    $('logoutBtn').classList.remove('hidden');

    $('signedInAs').textContent =
      user.email || 'Administrator';

    loadRecords();

  } else {
    if (user) signOut(auth);

    $('loginPanel').classList.remove('hidden');
    $('appPanel').classList.add('hidden');
    $('logoutBtn').classList.add('hidden');

    if (user) {
      $('loginMessage').textContent =
        'This account is not authorized as the portfolio administrator.';
    }
  }
});


// ========================================
// EVENT LISTENERS
// ========================================

document.querySelectorAll('.tabs button').forEach(button => {
  button.onclick = () => setType(button.dataset.tab);
});

$('contentForm').addEventListener(
  'submit',
  saveRecord
);

$('resetBtn').onclick = resetForm;

$('refreshBtn').onclick = loadRecords;

// Multiple photograph selection
$('imageFile').addEventListener('change', event => {
  const newFiles = Array.from(event.target.files || []);

  selectedFiles.push(...newFiles);

  updateFileInput();
  renderPreviews();
});
