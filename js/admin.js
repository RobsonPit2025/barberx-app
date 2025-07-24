import { initializeApp } from ".../firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from ".../firebase-auth.js";
import { getFirestore, collection, query, where, orderBy, onSnapshot } from ".../firebase-firestore.js";
import { firebaseConfig } from "./fila.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

onAuthStateChanged(auth, user => {
  if (!user || user.email !== "admin@barberx.com") window.location.href = "/index.html";
});

function renderQueue(bar, el) {
  const q = query(collection(db,"agendamentos"), where("barbeiro","==", bar), orderBy("criadoEm"));
  onSnapshot(q, snap => {
    el.innerHTML = '';
    snap.forEach(doc => {
      el.innerHTML += `<li>${doc.data().nome} - ${doc.data().data}</li>`;
    });
  });
}

renderQueue("Yuri", document.querySelector("#yuri ul"));
renderQueue("Pablo", document.querySelector("#pablo ul"));

document.getElementById("logout2").onclick = () => { signOut(auth); window.location.href="/index.html"; };