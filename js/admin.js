// admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function carregarAgendamentos() {
  const agendamentosRef = collection(db, "agendamentos");
  const q = query(agendamentosRef, orderBy("criadoEm", "desc"), limit(10));
  const querySnapshot = await getDocs(q);

  const container = document.getElementById("agendamentos");
  container.innerHTML = ""; // limpa antes de preencher

  querySnapshot.forEach((doc) => {
    const dados = doc.data();

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${dados.nome}</h3>
      <p><strong>Celular:</strong> ${dados.celular}</p>
      <p><strong>Data:</strong> ${dados.data}</p>
      <p><small>Agendado em: ${new Date(dados.criadoEm?.seconds * 1000).toLocaleString()}</small></p>
    `;

    container.appendChild(card);
  });
}

carregarAgendamentos();
