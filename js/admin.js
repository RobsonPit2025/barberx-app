function mostrarSecao(id) {
  console.log("Mostrando seção:", id);
  document.querySelectorAll('.painel').forEach(painel => {
    painel.classList.add('hidden');
  });

  const secaoAtiva = document.getElementById(id);
  if (secaoAtiva) {
    secaoAtiva.classList.remove('hidden');
  }
}
// Torna a função acessível no HTML
window.mostrarSecao = mostrarSecao;
// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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

function renderAgendamento(dados, container, id) {
  const div = document.createElement("div");
  div.classList.add("agendamento");
  div.innerHTML = `
    <p><strong>Nome:</strong> ${dados.nome}</p>
    <p><strong>Celular:</strong> ${dados.celular}</p>
    <p><strong>Mensagem:</strong> ${dados.mensagem}</p>
    <button class="btn-concluir" data-id="${id}">Corte Concluído</button>
  `;
  container.appendChild(div);

  // Botão de concluir
div.querySelector(".btn-concluir").addEventListener("click", async () => {
  try {
    // Registrar no Firestore (coleção relatorios)
    const dataAtual = new Date();
    await addDoc(collection(db, "relatorios"), {
      barbeiro: dados.barbeiro,
      data: dataAtual.toISOString(),
    });

    // Remover da fila de agendamentos
    await deleteDoc(doc(db, "agendamentos", id));
    console.log("Agendamento finalizado e registrado.");
  } catch (error) {
    console.error("Erro ao concluir corte:", error);
  }
});
}

onSnapshot(collection(db, "agendamentos"), (snapshot) => {
  containerYuri.innerHTML = "";
  containerPablo.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const barbeiro = data.barbeiro?.toLowerCase();

    if (barbeiro === "yuri" || barbeiro === "yure") {
      renderAgendamento(data, containerYuri, docSnap.id);
    } else if (barbeiro === "pablo") {
      renderAgendamento(data, containerPablo, docSnap.id);
    }
  });
});

// Gerar relatório mensal
function gerarRelatorio(snapshot) {
  const resumo = {};

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const barbeiro = data.barbeiro?.toLowerCase();
    const dataObj = new Date(data.data);
    const mesAno = `${dataObj.getMonth() + 1}/${dataObj.getFullYear()}`;

    if (!resumo[mesAno]) {
      resumo[mesAno] = { yure: 0, pablo: 0 };
    }

    if (barbeiro === "yuri" || barbeiro === "yure") {
      resumo[mesAno].yure++;
    } else if (barbeiro === "pablo") {
      resumo[mesAno].pablo++;
    }
  });

  const tbody = document.querySelector("#tabelaRelatorio tbody");
  tbody.innerHTML = "";

  Object.entries(resumo).forEach(([mesAno, dados]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${mesAno}</td>
      <td>${dados.yure}</td>
      <td>${dados.pablo}</td>
    `;
    tbody.appendChild(tr);
  });
}

onSnapshot(collection(db, "relatorios"), gerarRelatorio);

import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// Função para sair
const logoutBtn = document.getElementById("logout2");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    const auth = getAuth();
    signOut(auth)
      .then(() => {
        console.log("Usuário deslogado com sucesso");
        window.location.href = "index.html"; // Redireciona para tela de login
      })
      .catch((error) => {
        console.error("Erro ao deslogar:", error);
      });
  });
}