import { initializeApp } from "https://.../firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from ".../firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from ".../firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginEl = document.getElementById('login-section');
const ageEl = document.getElementById('agendamento-section');

onAuthStateChanged(auth, user => {
  if (user) mostrar(user);
  else mostrar(null);
});

async function login() {
  const e = email.value, p = password.value;
  try { await signInWithEmailAndPassword(auth, e, p); }
  catch (e) { alert(e.message); }
}

async function cadastrar() {
  const e = email.value, p = password.value;
  try { await createUserWithEmailAndPassword(auth, e, p); }
  catch (e) { alert(e.message); }
}

async function agendar() {
  const nome = nomeAgendamento.value, cel = celAgendamento.value, bar = barbeiroAgendamento.value, d = dataAgendamento.value;
  if (!nome||!cel||!bar||!d) return alert("Preencha!");
  await addDoc(collection(db, "agendamentos"), { nome, cel, barbeiro: bar, data: d, criadoEm: serverTimestamp(), uid: auth.currentUser.uid });
  loadFila(bar, d);
  alert("Agendado!");
}

async function loadFila(bar, d) {
  const q = query(collection(db, "agendamentos"), where("barbeiro", "==", bar), where("criadoEm", "<", serverTimestamp()), orderBy("criadoEm"));
  const ss = await getDocs(q);
  filaCliente.innerHTML = '';
  ss.forEach(doc => { filaCliente.innerHTML += `<li>${doc.data().nome} (${doc.data().data})</li>` });
}

function mostrar(user){
  if (!user) { loginEl.classList.add("active-section"); ageEl.classList.remove("active-section"); return; }
  loginEl.classList.remove("active-section"); ageEl.classList.add("active-section");
}

btnLogin.onclick=login;
btnRegister.onclick=cadastrar;
btnAgendar.onclick=agendar;
btnLogout1.onclick=()=>signOut(auth);