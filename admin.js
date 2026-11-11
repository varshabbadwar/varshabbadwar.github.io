import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
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
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Must match the administrator UID used in your Firestore Security Rules.
const ADMIN_UID = "Iv50JJ7KrNeREMftM70eqGmOWYJ3";
const COLLECTIONS = {
  gallery: { singular: "gallery memory", plural: "Gallery records", image: true, category: true, date: true },
  awards: { singular: "award", plural: "Awards", image: false, category: false, date: false },
  activities: { singular: "activity", plural: "Activities", image: true, category: true, date: true }
};

const $ = (id) => document.getElementById(id);
let activeCollection = "gallery";
let currentUser = null;

function showMessage(element, message, type = "error") {
  element.textContent = message;
  element.className = `message ${type}`;
}
function clearMessage(element) {
  element.textContent = "";
  element.className = "message";
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function setCollection(collectionName) {
  activeCollection = collectionName;
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.collection === collectionName));
  const config = COLLECTIONS[collectionName];
  $("formHeading").textContent = `Add ${config.singular}`;
  $("listHeading").textContent = config.plural;
  $("categoryField").classList.toggle("hidden", !config.category);
  $("dateField").classList.toggle("hidden", !config.date);
  $("imageField").classList.toggle("hidden", !config.image);
  $("category").required = config.category;
  $("imageUrl").required = config.image;
  $("descriptionLabel").textContent = collectionName === "awards" ? "Award details" : "Description";
  resetForm();
  loadRecords();
}
function resetForm() {
  $("recordForm").reset();
  $("recordId").value = "";
  $("published").checked = true;
  $("formHeading").textContent = `Add ${COLLECTIONS[activeCollection].singular}`;
  $("saveBtn").textContent = "Save record";
  $("cancelEditBtn").classList.add("hidden");
  clearMessage($("formMessage"));
}
function validateRecord() {
  const config = COLLECTIONS[activeCollection];
  const title = $("title").value.trim();
  const year = Number($("year").value);
  const imageUrl = $("imageUrl").value.trim();
  if (!title || !Number.isInteger(year) || year < 1990 || year > 2100) throw new Error("Enter a title and a valid year between 1990 and 2100.");
  if (config.image && !/^https:\/\//i.test(imageUrl)) throw new Error("Please enter a publicly accessible HTTPS image URL.");
  const record = {
    title,
    year: String(year),
    description: $("description").value.trim(),
    published: $("published").checked,
    updatedAt: serverTimestamp()
  };
  if (config.category) record.category = $("category").value.trim();
  if (config.date) record.date = $("date").value.trim();
  if (config.image) record.imageUrl = imageUrl;
  if (activeCollection === "awards") record.detail = record.description;
  return record;
}
async function loadRecords() {
  $("recordList").innerHTML = '<div class="empty">Loading records…</div>';
  $("recordCount").textContent = "Loading…";
  try {
    const recordsQuery = query(collection(db, activeCollection), orderBy("year", "desc"));
    const snapshot = await getDocs(recordsQuery);
    const records = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    $("recordCount").textContent = `${records.length} record${records.length === 1 ? "" : "s"}`;
    if (!records.length) {
      $("recordList").innerHTML = '<div class="empty">No records yet. Add your first one using the form.</div>';
      return;
    }
    $("recordList").innerHTML = records.map((record) => {
      const image = record.imageUrl || record.image || "";
      const imageHtml = image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '<div></div>';
      const detail = [record.year, record.category, record.date].filter(Boolean).map(escapeHtml).join(" · ");
      return `<article class="record">${imageHtml}<div><h4>${escapeHtml(record.title || "Untitled")}</h4><p>${detail}</p><span class="status ${record.published ? "live" : "draft"}">${record.published ? "Published" : "Draft"}</span></div><div class="record-actions"><button class="btn secondary small" data-action="edit" data-id="${escapeHtml(record.id)}" type="button">Edit</button><button class="btn danger small" data-action="delete" data-id="${escapeHtml(record.id)}" type="button">Delete</button></div></article>`;
    }).join("");
    $("recordList").querySelectorAll("button[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const record = records.find((item) => item.id === button.dataset.id);
        if (!record) return;
        if (button.dataset.action === "edit") editRecord(record);
        if (button.dataset.action === "delete") removeRecord(record);
      });
    });
  } catch (error) {
    console.error("Unable to load admin records:", error);
    $("recordCount").textContent = "Could not load records";
    $("recordList").innerHTML = '<div class="empty">Unable to load records. Check Firestore rules and your connection.</div>';
  }
}
function editRecord(record) {
  $("recordId").value = record.id;
  $("title").value = record.title || "";
  $("year").value = record.year || "";
  $("category").value = record.category || "";
  $("date").value = record.date || "";
  $("imageUrl").value = record.imageUrl || record.image || "";
  $("description").value = record.description || record.detail || "";
  $("published").checked = record.published === true;
  $("formHeading").textContent = `Edit ${COLLECTIONS[activeCollection].singular}`;
  $("saveBtn").textContent = "Update record";
  $("cancelEditBtn").classList.remove("hidden");
  clearMessage($("formMessage"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
async function removeRecord(record) {
  if (!window.confirm(`Delete “${record.title || "this record"}” permanently?`)) return;
  try {
    await deleteDoc(doc(db, activeCollection, record.id));
    await loadRecords();
  } catch (error) {
    console.error("Delete failed:", error);
    alert("Could not delete this record. Check your Firestore security rules.");
  }
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage($("loginMessage"));
  $("loginBtn").disabled = true;
  $("loginBtn").textContent = "Signing in…";
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch (error) {
    console.error("Admin sign-in failed:", error);
    showMessage($("loginMessage"), "Sign-in failed. Check the email/password and Firebase Authentication settings.");
  } finally {
    $("loginBtn").disabled = false;
    $("loginBtn").textContent = "Sign in";
  }
});

$("logoutBtn").addEventListener("click", () => signOut(auth));
document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => setCollection(tab.dataset.collection)));
$("cancelEditBtn").addEventListener("click", resetForm);
$("refreshBtn").addEventListener("click", loadRecords);
$("recordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage($("formMessage"));
  $("saveBtn").disabled = true;
  try {
    const record = validateRecord();
    const id = $("recordId").value;
    if (id) {
      await updateDoc(doc(db, activeCollection, id), record);
      showMessage($("formMessage"), "Record updated successfully.", "success");
    } else {
      record.createdAt = serverTimestamp();
      await addDoc(collection(db, activeCollection), record);
      showMessage($("formMessage"), "Record saved successfully.", "success");
    }
    resetForm();
    await loadRecords();
  } catch (error) {
    console.error("Save failed:", error);
    showMessage($("formMessage"), error.message || "Could not save the record. Check Firestore rules.");
  } finally {
    $("saveBtn").disabled = false;
  }
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user && user.uid === ADMIN_UID) {
    $("loginPanel").classList.add("hidden");
    $("adminPanel").classList.remove("hidden");
    $("logoutBtn").classList.remove("hidden");
    $("signedInAs").textContent = user.email || "Administrator";
    setCollection(activeCollection);
  } else {
    if (user) signOut(auth);
    $("adminPanel").classList.add("hidden");
    $("loginPanel").classList.remove("hidden");
    $("logoutBtn").classList.add("hidden");
    $("signedInAs").textContent = "";
    if (user) showMessage($("loginMessage"), "This account is not authorized to administer this portfolio.");
  }
});
