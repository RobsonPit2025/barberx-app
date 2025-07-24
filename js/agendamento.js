// agendamento.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js"; // Crie este arquivo ou use as credenciais direto aqui

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Verifica se o usuário está logado
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  }
});

const form = document.getElementById("formAgendamento");
const mensagem = document.getElementById("mensagem");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nome").value;
  const celular = document.getElementById("celular").value;
  const data = document.getElementById("data").value;

  try {
    await addDoc(collection(db, "agendamentos"), {
      nome,
      celular,
      data,
      criadoEm: new Date()
    });

    mensagem.textContent = "Agendamento realizado com sucesso!";
    form.reset();
  } catch (error) {
    console.error("Erro ao agendar:", error);
    mensagem.textContent = "Erro ao agendar. Tente novamente.";
  }
});
