// Importar Firebase (em agendamento.html você precisa usar type="module" OU importar os scripts por CDN separadamente)
// Firebase SDKs
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onSnapshot as onSnapshotFirestore, query, where } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
const auth = getAuth();

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

      // Bloqueio preventivo: impede múltiplos agendamentos com o mesmo número (verificação no Firestore)
      const agendamentosRef = collection(db, "agendamentos");
      const querySnapshot = await getDocs(agendamentosRef);
      const agendamentoPendente = querySnapshot.docs.find(
        (doc) => doc.data().celular === celular && doc.data().status === "pendente"
      );

      if (agendamentoPendente) {
        localStorage.setItem(`bloqueado_${celular}`, "true");
        alert("Você já possui um agendamento pendente. Aguarde o corte ser concluído.");
        return;
      }
      try {
        const user = auth.currentUser;
        const email = user ? user.email : "";

        await addDoc(collection(db, "agendamentos"), {
          nome,
          celular,
          barbeiro,
          mensagem,
          criadoEm: new Date(),
          status: "pendente",
          email // <-- adiciona o e-mail automaticamente
        });

        // Após adicionar, buscar posição na fila e bloquear localmente
        const querySnapshot = await getDocs(collection(db, "agendamentos"));
        const filaAtual = querySnapshot.docs
          .filter(doc => doc.data().barbeiro === barbeiro && doc.data().status === "pendente")
          .sort((a, b) => {
            const dataA = new Date(a.data().criadoEm);
            const dataB = new Date(b.data().criadoEm);
            return dataA - dataB;
          });
        const nomesFila = filaAtual
          .filter(doc => doc.data().celular !== celular)
          .map((doc, index) => `${index + 1}º - ${doc.data().nome}`);
        const posicaoFila = filaAtual.length;

        painel.innerHTML = `
          <h3>Agendamento realizado com sucesso!</h3>
          <p>Você é o número ${posicaoFila} na fila do barbeiro ${barbeiro}.</p>
          ${nomesFila.length > 0 ? `<p>Pessoas na sua frente:</p><ul>${nomesFila.map(nome => `<li>${nome}</li>`).join("")}</ul>` : ""}
        `;

        // Armazena bloqueio localmente (enquanto não for liberado no admin)
        localStorage.setItem(`bloqueado_${celular}`, "true");
        // O desbloqueio acontece no painel admin quando o corte é concluído.
        form.reset();
        console.log("Agendamento salvo com sucesso no Firebase.");
      } catch (error) {
        console.error("Erro ao salvar agendamento:", error);
        alert("Erro ao salvar o agendamento. Tente novamente.");
      }
    });
  }

  // ========== Monitorar em tempo real a posição do usuário logado na fila ==========
  const painelFila = document.getElementById("painelFila");

  auth.onAuthStateChanged((user) => {
    if (user && painelFila) {
      const userEmail = user.email;

      const unsubscribe = onSnapshotFirestore(collection(db, "agendamentos"), (snapshot) => {
        const agendamentosPendentes = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(doc => doc.status === "pendente");

        const agendamentoDoUsuario = agendamentosPendentes.find(doc => doc.email === userEmail);

        if (agendamentoDoUsuario) {
          const barbeiro = agendamentoDoUsuario.barbeiro;
          const filaDoMesmoBarbeiro = agendamentosPendentes
            .filter(doc => doc.barbeiro === barbeiro)
            .sort((a, b) => {
              const dataA = a.criadoEm.toDate();
              const dataB = b.criadoEm.toDate();
              return dataA - dataB;
            });

          const index = filaDoMesmoBarbeiro.findIndex(doc => doc.email === userEmail);
          const nomesFila = filaDoMesmoBarbeiro
            .slice(0, index) // apenas os que estão na frente do usuário
            .map((doc, idx) => `${idx + 1}º - ${doc.nome}`);

          const posicao = index + 1;

          painelFila.innerHTML = `
            <div id="painelInfoFila" style="background-color: #f5f5f5; color: #333; padding: 20px; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); max-width: 500px; margin: auto; text-align: center;">
              <h3 style="margin-bottom: 10px;">Agendamento Atualizado</h3>
              <p style="font-size: 18px;">Você é o número <strong>${posicao}</strong> na fila do barbeiro <strong>${barbeiro}</strong>.</p>
              <p style="margin-top: 5px;">Horário do agendamento: <strong>${agendamentoDoUsuario.criadoEm.toDate().toLocaleTimeString('pt-BR')}</strong></p>
              ${nomesFila.length > 0 ? `
                <p style="margin-top: 15px;">Pessoas na sua frente:</p>
                <ul style="list-style: none; padding: 0;">${nomesFila.map(nome => `<li style="padding: 3px 0;">${nome}</li>`).join("")}</ul>
              ` : ""}
              <button onclick="location.reload()" style="margin-top: 15px; background-color: #000; color: #fff; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                Atualizar Fila
              </button>
            </div>
          `;
        } else {
          painelFila.innerHTML = `<p>Você não possui agendamento pendente no momento.</p>`;
        }
      });
    }
  });
});

// Ouve mensagens de desbloqueio vindas do painel admin
const unlockChannel = new BroadcastChannel("barberx_unlock");
unlockChannel.addEventListener("message", (event) => {
  const celular = event.data?.celular;
  if (celular) {
    localStorage.removeItem(`bloqueado_${celular}`);
    alert("Seu agendamento foi concluído. Agora você pode marcar um novo corte.");
    console.log(`Agendamento liberado para ${celular}`);
  }
});