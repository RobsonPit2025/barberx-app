// Importar Firebase (em agendamento.html você precisa usar type="module" OU importar os scripts por CDN separadamente)
// Firebase SDKs
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
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
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}
const db = getFirestore(app);

window.addEventListener("DOMContentLoaded", function () {
  const celularInput = document.getElementById("agendamentoCelular");
  const form = document.getElementById("formAgendamento");
  const painel = document.getElementById("painelFila");

  if (celularInput) {
    celularInput.addEventListener("input", function () {
      let valor = celularInput.value.replace(/\D/g, "");
      if (valor.length > 11) valor = valor.slice(0, 11);

      valor = valor.replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*/, function (_, ddd, prefixo, sufixo) {
        let resultado = "";
        if (ddd) resultado += `(${ddd}`;
        if (ddd.length === 2) resultado += `) `;
        if (prefixo) resultado += prefixo;
        if (prefixo.length === 5 && sufixo) resultado += `-${sufixo}`;
        return resultado;
      });

      celularInput.value = valor;
    });
  }

  if (form && painel) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const nome = document.getElementById("nome").value.trim();
      const celular = celularInput?.value.trim();
      const barbeiro = document.getElementById("barbeiro").value;
      const mensagem = document.getElementById("mensagem").value.trim();

      if (!nome || !celular || !barbeiro) {
        alert("Preencha todos os campos obrigatórios.");
        return;
      }

      try {
        await addDoc(collection(db, "agendamentos"), {
          nome,
          celular,
          barbeiro,
          mensagem,
          status: "pendente",
          criadoEm: new Date()
        });

        painel.innerHTML = `<h3>Agendamento realizado com sucesso!</h3>`;
        form.reset();
        console.log("Agendamento salvo com sucesso no Firebase.");
      } catch (error) {
        console.error("Erro ao salvar agendamento:", error);
        alert("Erro ao salvar o agendamento. Tente novamente.");
      }
    });
  }
});