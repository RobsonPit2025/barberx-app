// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCnsA89psIo30sQdBM9wFFzydnfOLcOKIc",
  authDomain: "barbex-app.firebaseapp.com",
  projectId: "barbex-app",
  storageBucket: "barbex-app.firebasestorage.app",
  messagingSenderId: "91864465722",
  appId: "1:91864465722:web:7a3365582f3ca63e19d003"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// Mostrar agendamentos
const containerYuri = document.getElementById("agendamentosYuri");
const containerPablo = document.getElementById("agendamentosPablo");

function renderAgendamento(doc, container) {
  const div = document.createElement("div");
  div.classList.add("agendamento");
  div.innerHTML = `
    <p><strong>Nome:</strong> ${doc.nome}</p>
    <p><strong>Celular:</strong> ${doc.celular}</p>
    <p><strong>Mensagem:</strong> ${doc.mensagem}</p>
  `;
  container.appendChild(div);
}

onSnapshot(collection(db, "agendamentos"), (snapshot) => {
  containerYuri.innerHTML = "";
  containerPablo.innerHTML = "";

  snapshot.forEach((doc) => {
    const data = doc.data();
    const barbeiro = data.barbeiro?.toLowerCase();

    if (barbeiro === "yuri" || barbeiro === "yure") {
      renderAgendamento(data, containerYuri);
    } else if (barbeiro === "pablo") {
      renderAgendamento(data, containerPablo);
    }
  });
});