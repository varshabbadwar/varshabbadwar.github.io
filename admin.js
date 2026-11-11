import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const ADMIN_UID = 'Iv50JJ7KrNeREMftM70eqGmOWYJ3';
const WORKER_URL = 'https://REPLACE-WITH-YOUR-WORKER.workers.dev';
const $ = id => document.getElementById(id);
let activeType = 'gallery';
let currentUser = null;
let existingImageUrl = '';

function status(message, error=false){ $('status').textContent=message; $('status').classList.toggle('error',error); }
function resetForm(){ $('contentForm').reset(); $('docId').value=''; $('year').value=new Date().getFullYear(); $('published').checked=true; $('imageFile').value=''; $('preview').classList.add('hidden'); existingImageUrl=''; $('saveBtn').textContent='Upload & Save'; }
function setType(type){ activeType=type; $('recordType').value=type; document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===type)); $('categoryWrap').classList.toggle('hidden',type==='awards'); $('dateWrap').classList.toggle('hidden',type==='awards'); $('imageWrap').classList.toggle('hidden',type==='awards'); $('detailLabel').querySelector('label').textContent=type==='awards'?'Details *':'Description *'; $('listTitle').textContent=type==='awards'?'Awards':'Gallery entries'; resetForm(); loadRecords(); }
async function uploadImage(file){
  if(!file) return existingImageUrl;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WebP image.');
  if(file.size>5*1024*1024) throw new Error('Image must be 5 MB or smaller.');
  if(WORKER_URL.includes('REPLACE-WITH')) throw new Error('Cloudflare Worker URL is not configured yet. Follow the README deployment steps.');
  const token=await currentUser.getIdToken(true);
  const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
  const safeName=file.name.toLowerCase().replace(/[^a-z0-9.-]+/g,'-').replace(/^-+|-+$/g,'').slice(-90);
  const response=await fetch(`${WORKER_URL}/upload`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({fileName:safeName,contentType:file.type,contentBase64:base64,year:$('year').value,category:activeType})});
  const data=await response.json().catch(()=>({})); if(!response.ok) throw new Error(data.error||`Image upload failed (${response.status}).`); return data.imageUrl;
}
async function saveRecord(event){
 event.preventDefault(); if(!currentUser||currentUser.uid!==ADMIN_UID) return;
 $('saveBtn').disabled=true; status('Saving record…');
 try{
  let imageUrl=existingImageUrl; const file=$('imageFile').files[0]; if(activeType==='gallery' && file) {status('Uploading image to GitHub…'); imageUrl=await uploadImage(file);} if(activeType==='gallery'&&!imageUrl) throw new Error('Please select a photograph.');
  const data={title:$('title').value.trim(),year:String($('year').value),detail:$('description').value.trim(),description:$('description').value.trim(),published:$('published').checked,updatedAt:serverTimestamp()};
  if(activeType==='gallery'){data.category=$('category').value;data.date=$('date').value;data.imageUrl=imageUrl;data.image=imageUrl;}
  const id=$('docId').value;
  if(id) await updateDoc(doc(db,activeType,id),data); else await addDoc(collection(db,activeType),{...data,createdAt:serverTimestamp()});
  status(activeType==='gallery'?'Gallery entry saved successfully.':'Award saved successfully.'); resetForm(); await loadRecords();
 }catch(e){console.error(e);status(e.message||'Unable to save record.',true);}finally{$('saveBtn').disabled=false;}
}
async function loadRecords(){
 if(!currentUser)return; $('records').textContent='Loading…';
 try{const snap=await getDocs(query(collection(db,activeType),orderBy('createdAt','desc'))); $('records').innerHTML=''; if(snap.empty){$('records').textContent='No records yet.';return;}
 snap.forEach(s=>{const d=s.data();const el=document.createElement('div');el.className='item';const info=document.createElement('div');const title=document.createElement('strong');title.textContent=d.title||'Untitled';const meta=document.createElement('small');meta.textContent=`${d.year||''} · ${d.published?'Published':'Draft'}`;info.append(title,meta);const actions=document.createElement('div');actions.className='row';const edit=document.createElement('button');edit.className='secondary';edit.textContent='Edit';edit.onclick=()=>editRecord(s.id,d);const del=document.createElement('button');del.className='danger';del.textContent='Delete';del.onclick=()=>removeRecord(s.id,d.title);actions.append(edit,del);el.append(info,actions);$('records').append(el);});
 }catch(e){console.error(e);$('records').textContent='Could not load records: '+e.message;}
}
function editRecord(id,d){$('docId').value=id;$('title').value=d.title||'';$('year').value=d.year||new Date().getFullYear();$('description').value=d.description||d.detail||'';$('published').checked=!!d.published;if(activeType==='gallery'){$('category').value=d.category||'Other';$('date').value=d.date||'';existingImageUrl=d.imageUrl||d.image||'';$('preview').src=existingImageUrl;$('preview').classList.toggle('hidden',!existingImageUrl);}$('saveBtn').textContent='Update record';window.scrollTo({top:0,behavior:'smooth'});}
async function removeRecord(id,title){if(!confirm(`Delete “${title}” from Firestore? The image file in GitHub will remain for safety.`))return;try{await deleteDoc(doc(db,activeType,id));status('Record deleted. Its GitHub image was retained.');await loadRecords();}catch(e){status(e.message,true);}}
$('loginBtn').onclick=async()=>{ $('loginMessage').textContent='Signing in…';try{await signInWithEmailAndPassword(auth,$('email').value.trim(),$('password').value);}catch(e){$('loginMessage').textContent=e.message;}};
$('logoutBtn').onclick=()=>signOut(auth);
onAuthStateChanged(auth,user=>{currentUser=user;if(user&&user.uid===ADMIN_UID){$('loginPanel').classList.add('hidden');$('appPanel').classList.remove('hidden');$('logoutBtn').classList.remove('hidden');$('signedInAs').textContent=user.email||'Administrator';loadRecords();}else{if(user)signOut(auth);$('loginPanel').classList.remove('hidden');$('appPanel').classList.add('hidden');$('logoutBtn').classList.add('hidden');if(user)$('loginMessage').textContent='This account is not authorized as the portfolio administrator.';}});
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>setType(b.dataset.tab));$('contentForm').addEventListener('submit',saveRecord);$('resetBtn').onclick=resetForm;$('refreshBtn').onclick=loadRecords;
$('imageFile').addEventListener('change',()=>{const f=$('imageFile').files[0];if(!f)return;const url=URL.createObjectURL(f);$('preview').src=url;$('preview').classList.remove('hidden');});
