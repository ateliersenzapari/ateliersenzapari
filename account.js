// Sistema de conta — Firebase Auth + Firestore, compartilhado por todas as páginas
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile, sendPasswordResetEmail,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, addDoc,
  query, orderBy, onSnapshot, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDfqa7OPxwOrAu7ghkti-NNGI4o1J_fnGw",
  authDomain: "senza-pari.firebaseapp.com",
  projectId: "senza-pari",
  storageBucket: "senza-pari.firebasestorage.app",
  messagingSenderId: "601037484661",
  appId: "1:601037484661:web:e35fa1798b7526aafefe3c",
  measurementId: "G-ZC9KJ90WGX",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function signUp(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, "users", cred.user.uid), {
    name,
    email,
    createdAt: serverTimestamp(),
  });
  await sendEmailVerification(cred.user);
  return cred.user;
}

function resendVerification() {
  if (!auth.currentUser) return Promise.reject(new Error("not-logged-in"));
  return sendEmailVerification(auth.currentUser);
}

function logIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

function logOut() {
  return signOut(auth);
}

function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

async function saveOrder(cart) {
  if (!auth.currentUser || !cart || cart.length === 0) return null;
  const ref = await addDoc(collection(db, "users", auth.currentUser.uid, "orders"), {
    items: cart,
    createdAt: serverTimestamp(),
    status: "Aguardando confirmação",
  });
  return ref.id;
}

function watchOrders(callback) {
  if (!auth.currentUser) { callback([]); return () => {}; }
  const q = query(collection(db, "users", auth.currentUser.uid, "orders"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

async function getProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

window.senzaAccount = {
  auth, db,
  signUp, logIn, logOut, resetPassword, saveOrder, watchOrders, getProfile, resendVerification,
};

// ---------- Ícone de conta no header (dropdown) ----------
function firstName(user) {
  if (!user) return "";
  const n = user.displayName || (user.email ? user.email.split("@")[0] : "");
  return n.split(" ")[0];
}

function buildDropdown(btn, user) {
  const existing = document.getElementById("accountDropdown");
  if (existing) existing.remove();
  const panel = document.createElement("div");
  panel.className = "account-dropdown";
  panel.id = "accountDropdown";
  if (user) {
    panel.innerHTML = `
      <div class="account-dropdown-hello">Olá, ${firstName(user)}</div>
      <a href="conta.html" class="account-dropdown-row">Minha conta</a>
      <a href="conta.html#pedidos" class="account-dropdown-row">Meus pedidos</a>
      <button class="account-dropdown-row" id="accountLogoutBtn">Sair</button>
    `;
  } else {
    panel.innerHTML = `
      <a href="conta.html" class="account-dropdown-row">Entrar</a>
      <a href="conta.html?modo=criar" class="account-dropdown-row">Criar conta</a>
      <a href="conta.html#pedidos" class="account-dropdown-row">Rastrear pedido</a>
    `;
  }
  btn.parentElement.style.position = "relative";
  btn.parentElement.appendChild(panel);
  const logoutBtn = document.getElementById("accountLogoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await logOut();
      panel.classList.remove("open");
    });
  }
  return panel;
}

function initAccountIcon() {
  const btn = document.getElementById("accountBtn");
  if (!btn) return;
  let currentUser = null;
  let panel = buildDropdown(btn, null);

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    panel = document.getElementById("accountDropdown") || buildDropdown(btn, currentUser);
    panel.classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    const p = document.getElementById("accountDropdown");
    if (p && !p.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      p.classList.remove("open");
    }
  });

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    btn.classList.toggle("logged-in", !!user);
    btn.setAttribute("aria-label", user ? `Conta de ${firstName(user)}` : "Conta");
    buildDropdown(btn, user);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAccountIcon);
} else {
  initAccountIcon();
}
