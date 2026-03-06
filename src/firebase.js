import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function getProjects(nicknameFilter = null) {
  const filters = [where('status', '==', 'submitted')];
  if (nicknameFilter) filters.push(where('nickname', '==', nicknameFilter));
  const q = query(collection(db, 'projects'), ...filters);
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
}

export async function getProject(id) {
  const snap = await getDoc(doc(db, 'projects', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function saveProject(data) {
  if (data.id) {
    const { id, ...rest } = data;
    await updateDoc(doc(db, 'projects', id), rest);
    return id;
  }
  const ref = await addDoc(collection(db, 'projects'), {
    ...data,
    createdAt: serverTimestamp(),
    badge: false,
  });
  return ref.id;
}

export async function submitProject(id) {
  await updateDoc(doc(db, 'projects', id), { status: 'submitted' });
}

export async function toggleBadge(id, currentBadge) {
  await updateDoc(doc(db, 'projects', id), { badge: !currentBadge });
}

export async function deleteProject(id) {
  await deleteDoc(doc(db, 'projects', id));
}

export async function loadDraft(nickname) {
  const q = query(
    collection(db, 'projects'),
    where('nickname', '==', nickname),
    where('status', '==', 'draft')
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() };
}

export async function addComment(targetId, author, text) {
  await addDoc(collection(db, 'comments'), {
    targetId,
    author,
    text,
    createdAt: serverTimestamp(),
  });
}

export async function getComments(targetId) {
  const q = query(collection(db, 'comments'), where('targetId', '==', targetId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return ta - tb;
    });
}

export async function getCommentCountsForProject(projectId) {
  const q = query(
    collection(db, 'comments'),
    where('targetId', '>=', projectId),
    where('targetId', '<=', projectId + '\uf8ff')
  );
  const snapshot = await getDocs(q);
  const counts = {};
  let total = 0;
  snapshot.docs.forEach((d) => {
    const targetId = d.data().targetId;
    const suffix = targetId.slice(projectId.length);
    counts[suffix] = (counts[suffix] || 0) + 1;
    total++;
  });
  return { counts, total };
}
