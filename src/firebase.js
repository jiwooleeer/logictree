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
  setDoc,
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

// 임시저장 목록 전체 반환
export async function loadDrafts(nickname) {
  const q = query(
    collection(db, 'projects'),
    where('nickname', '==', nickname),
    where('status', '==', 'draft')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
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
      return tb - ta;
    });
}

// Help config
const DEFAULT_HELP = {
  goal: { help: '달성하고자 하는 구체적인 목표를 작성하세요.', placeholder: '달성하고자 하는 목표를 입력하세요' },
  blocker: { help: '목표 달성을 방해하는 장애물을 작성하세요.', placeholder: '목표를 가로막는 것을 입력하세요' },
  reason: { help: '블록커가 왜 발생하는지 원인을 분석하세요.', placeholder: '블록커가 발생하는 이유를 구체적으로 입력하세요' },
  hypothesis: { help: '문제를 해결할 수 있는 가설을 세우세요.', placeholder: '해결책을 입력하고 그 결과 어떻게 될지 입력하세요' },
  lesson: { help: '검증을 통해 새롭게 알게 된 사실을 기록하세요.', placeholder: '새롭게 알게 된 사실을 기록하세요.' },
};

let helpCache = null;

export function getDefaultHelp() {
  return DEFAULT_HELP;
}

export async function getHelpConfig() {
  if (helpCache) return helpCache;
  const snap = await getDoc(doc(db, 'config', 'helpTexts'));
  if (snap.exists()) {
    helpCache = { ...DEFAULT_HELP };
    const data = snap.data();
    for (const key of Object.keys(DEFAULT_HELP)) {
      if (data[key]) helpCache[key] = { ...DEFAULT_HELP[key], ...data[key] };
    }
    return helpCache;
  }
  return DEFAULT_HELP;
}

export async function saveHelpConfig(config) {
  await setDoc(doc(db, 'config', 'helpTexts'), config);
  helpCache = { ...DEFAULT_HELP };
  for (const key of Object.keys(DEFAULT_HELP)) {
    if (config[key]) helpCache[key] = { ...DEFAULT_HELP[key], ...config[key] };
  }
}

export async function getCommentCountsForProject(projectId) {
  const q = query(
    collection(db, 'comments'),
    where('targetId', '>=', projectId),
    where('targetId', '<=', projectId + '\uf8ff')
  );
  const snapshot = await getDocs(q);
  console.log(`프로젝트 ${projectId}의 댓글 쿼리 결과:`, snapshot.docs.map(d => d.data()));
  const counts = {};
  const latestAt = {};
  let total = 0;
  snapshot.docs.forEach((d) => {
    const data = d.data();
    const suffix = data.targetId.slice(projectId.length);
    counts[suffix] = (counts[suffix] || 0) + 1;
    const ts = data.createdAt?.toMillis?.() || 0;
    if (!latestAt[suffix] || ts > latestAt[suffix]) latestAt[suffix] = ts;
    total++;
  });
  console.log(`프로젝트 ${projectId}의 댓글 수:`, total);
  return { counts, latestAt, total };
}

export async function getCommentsForProject(projectId) {
  const q = query(
    collection(db, 'comments'),
    where('targetId', '>=', projectId),
    where('targetId', '<=', projectId + '\uf8ff')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}
