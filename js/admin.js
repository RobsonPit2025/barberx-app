import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, query, where, setDoc, updateDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

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

const auth = getAuth(app);

// --- Admins autorizados para abrir/fechar agendamentos ---
const ADMINS = ["admin1@barberx.com", "admin2@barberx.com"];

function isCurrentUserAdmin(){
  const u = auth.currentUser;
  return !!u && ADMINS.includes((u.email || "").toLowerCase());
}

// Desabilita o toggle até confirmar o papel do usuário
onAuthStateChanged(auth, (user) => {
  const isAdmin = !!user && ADMINS.includes((user.email || "").toLowerCase());
  if (toggleBookingsEl) toggleBookingsEl.disabled = !isAdmin;
  if (!isAdmin && toggleLabelEl) toggleLabelEl.title = "Apenas administradores podem alterar";
});

// ===== Controle Aberto/Fechado de Agendamentos =====
const toggleBookingsEl = document.getElementById("toggleBookings");
const toggleLabelEl = document.getElementById("toggleLabel");
const statusPillEl = document.getElementById("statusPill");
const settingsRef = doc(db, "settings", "app");

function setBookingUI(isOpen){
  if (toggleBookingsEl) toggleBookingsEl.checked = !!isOpen;
  if (toggleLabelEl) toggleLabelEl.textContent = isOpen ? "Agendamentos ABERTOS" : "Agendamentos FECHADOS";
  if (statusPillEl){
    statusPillEl.textContent = isOpen ? "Aberto" : "Fechado";
    statusPillEl.classList.toggle("open", !!isOpen);
    statusPillEl.classList.toggle("closed", !isOpen);
  }
}

async function ensureSettingsDoc(){
  const snap = await getDoc(settingsRef);
  if(!snap.exists()){
    await setDoc(settingsRef, {
      bookingsOpen: false,
      lastChangedAt: serverTimestamp(),
      lastChangedBy: auth.currentUser ? (auth.currentUser.email || auth.currentUser.uid) : "setup"
    });
  }
}

if (toggleBookingsEl || statusPillEl) {
  // ensureSettingsDoc será chamado somente quando um ADMIN estiver logado (veja onAuthStateChanged abaixo)

  // Escuta mudanças em tempo real no status
  onSnapshot(settingsRef, (snap) => {
    const data = snap.data();
    const isOpen = !!(data && data.bookingsOpen); // default FECHADO quando não houver doc
    setBookingUI(isOpen);
  });

  // Quando o admin alternar o checkbox, grava no Firestore
  if (toggleBookingsEl){
    toggleBookingsEl.addEventListener("change", async () => {
      // Permite alteração apenas a administradores
      if (!isCurrentUserAdmin()){
        alert("Apenas administradores podem alterar este status.");
        // Reverte o estado visual se o usuário não for admin
        setBookingUI(!toggleBookingsEl.checked);
        return;
      }

      const newState = !!toggleBookingsEl.checked;
      try {
        await updateDoc(settingsRef, {
          bookingsOpen: newState,
          lastChangedAt: serverTimestamp(),
          lastChangedBy: auth.currentUser ? (auth.currentUser.email || auth.currentUser.uid) : "unknown"
        });
      } catch (err) {
        console.error("Erro ao atualizar estado de agendamentos:", err);
        // Reverte visualmente se falhar
        setBookingUI(!newState);
        alert("Não foi possível alterar o status. Verifique se sua conta é admin.");
      }
    });
  }
}
// ===== FIM do Controle Aberto/Fechado =====

// Mostrar agendamentos
const containerYuri = document.getElementById("agendamentosYuri");
const containerPablo = document.getElementById("agendamentosPablo");

function renderAgendamento(dados, container, id) {
  const div = document.createElement("div");
  div.classList.add("agendamento");
  const dataHora = new Date(dados.timestamp?.seconds * 1000 || Date.now());
  const horaFormatada = dados.horarioFormatado || dataHora.toLocaleTimeString("pt-BR");
  const posicaoTexto = dados.posicao ? `${dados.posicao}º` : "—";

  div.innerHTML = `
    <p><strong>${posicaoTexto} na fila</strong></p>
    <p><strong>Nome:</strong> ${dados.nome}</p>
    <p><strong>Celular:</strong> ${dados.celular}</p>
    <p><strong>Mensagem:</strong> ${dados.mensagem || '-'} </p>
    <p><strong>Hora:</strong> ${horaFormatada}</p>

    <div class="pagamento">
      <p>
        <strong>Pagamento:</strong>
        <span class="badge">PIX</span>
        ${dados.amountOption ? `<span class="badge">${dados.amountOption === 'half' ? 'Metade' : 'Integral'}</span>` : ''}
        <span class="badge ${dados.paymentStatus === 'paid' ? 'badge-paid' : 'badge-pending'}">
          ${dados.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
        </span>
        ${typeof dados.amount === 'number' ? `<span class="badge">R$ ${Number(dados.amount).toFixed(2)}</span>` : ''}
      </p>
      ${dados.pixKey ? `<p><small><strong>Chave:</strong> ${dados.pixKey}</small></p>` : ''}
      ${dados.pixNote ? `<p><small><strong>Obs PIX:</strong> ${dados.pixNote}</small></p>` : ''}
    </div>

    <div class="acoes">
      ${dados.paymentMethod === 'pix' && dados.paymentStatus !== 'paid' ? `<button class="btn-confirmar-pix" data-id="${id}">Confirmar PIX</button>` : ''}
      <button class="btn-concluir" data-id="${id}">Corte Concluído</button>
    </div>
  `;
  container.appendChild(div);

  // Botão de concluir
  div.querySelector(".btn-concluir").addEventListener("click", async () => {
    try {
      // Atualiza status para concluido
      await updateDoc(doc(db, "agendamentos", id), {
        status: 'concluido',
        concluidoAt: serverTimestamp(),
        concluidoPor: auth.currentUser ? (auth.currentUser.email || auth.currentUser.uid) : 'admin'
      });

      // Registrar no Firestore (coleção relatorios) com mais detalhes
      await addDoc(collection(db, "relatorios"), {
        agendamentoId: id,
        nome: dados.nome || '',
        barbeiro: dados.barbeiro || '',
        celular: dados.celular || '',
        servico: dados.servico || '',
        paymentMethod: dados.paymentMethod || 'pix',
        paymentStatus: dados.paymentStatus || 'pending',
        amountOption: dados.amountOption || null,
        amount: typeof dados.amount === 'number' ? dados.amount : null,
        createdAt: serverTimestamp(),
        concluidoPor: auth.currentUser ? (auth.currentUser.email || auth.currentUser.uid) : 'admin'
      });

      // Remover da fila de agendamentos
      await deleteDoc(doc(db, "agendamentos", id));
      console.log("Agendamento finalizado e registrado.");
    } catch (error) {
      console.error("Erro ao concluir corte:", error);
    }
  });

  // Botão Confirmar PIX (se existir)
  const btnPix = div.querySelector('.btn-confirmar-pix');
  if (btnPix) {
    btnPix.addEventListener('click', async () => {
      if (!isCurrentUserAdmin()) { alert('Apenas administradores.'); return; }
      try {
        await updateDoc(doc(db, 'agendamentos', id), {
          paymentStatus: 'paid',
          paidAt: serverTimestamp(),
          paidBy: auth.currentUser ? (auth.currentUser.email || auth.currentUser.uid) : 'admin',
          status: 'pendente' // agora entra na fila
        });
        alert('PIX confirmado. Cliente entrou na fila.');
      } catch (e) {
        console.error('Erro ao confirmar PIX:', e);
        alert('Não foi possível confirmar o PIX agora.');
      }
    });
  }
}

const qYuri = query(collection(db, "agendamentos"), where("barbeiro", "in", ["Yuri", "Yure"]));
const qPablo = query(collection(db, "agendamentos"), where("barbeiro", "==", "Pablo"));

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

// ===== Assinaturas condicionais após autenticação =====
let unsubscribeYuri = null;
let unsubscribePablo = null;
let unsubscribeRelatorios = null;

onAuthStateChanged(auth, (user) => {
  // Cancela assinaturas anteriores
  if (unsubscribeYuri) { try { unsubscribeYuri(); } catch(e) {} unsubscribeYuri = null; }
  if (unsubscribePablo) { try { unsubscribePablo(); } catch(e) {} unsubscribePablo = null; }
  if (unsubscribeRelatorios) { try { unsubscribeRelatorios(); } catch(e) {} unsubscribeRelatorios = null; }

  const email = (user?.email || "").toLowerCase();
  const isAdminUser = ADMINS.includes(email);

  if (!user) {
    // Sem login, não assina nada que exija auth; opcionalmente redirecionar
    // window.location.href = "index.html";
    // Limpa UI de relatório
    const tbody = document.querySelector("#tabelaRelatorio tbody");
    if (tbody) tbody.innerHTML = "";
    return;
  }

  // Usuário logado pode ler agendamentos (rules exigem request.auth != null)
  unsubscribeYuri = onSnapshot(qYuri, (snapshot) => {
    containerYuri.innerHTML = "";

    // separa por status
    const pendentes = [];
    const aguardando = [];
    snapshot.docs.forEach(docSnap => {
      const d = docSnap.data();
      if (d.status === 'pendente') pendentes.push(docSnap);
      else aguardando.push(docSnap);
    });

    // ordena por criadoEm e renderiza pendentes com posição
    pendentes.sort((a, b) => {
      const t1 = a.data().criadoEm?.seconds || 0;
      const t2 = b.data().criadoEm?.seconds || 0;
      return t1 - t2;
    }).forEach((docSnap, index) => {
      const data = docSnap.data();
      const horarioCompleto = new Date(data.criadoEm?.seconds * 1000 || Date.now());
      const horarioFormatado = horarioCompleto.toLocaleTimeString("pt-BR", { hour12: false }) + '.' + (data.criadoEm?.nanoseconds || '000000000');
      data.posicao = index + 1; // só pendentes entram na fila
      data.horarioFormatado = horarioFormatado;
      renderAgendamento(data, containerYuri, docSnap.id);
    });

    // depois renderiza aguardando_pagamento SEM posição
    aguardando.sort((a, b) => {
      const t1 = a.data().criadoEm?.seconds || 0;
      const t2 = b.data().criadoEm?.seconds || 0;
      return t1 - t2;
    }).forEach((docSnap) => {
      const data = docSnap.data();
      const horarioCompleto = new Date(data.criadoEm?.seconds * 1000 || Date.now());
      const horarioFormatado = horarioCompleto.toLocaleTimeString("pt-BR", { hour12: false }) + '.' + (data.criadoEm?.nanoseconds || '000000000');
      data.posicao = null; // não exibe número na fila
      data.horarioFormatado = horarioFormatado;
      renderAgendamento(data, containerYuri, docSnap.id);
    });
  });

  unsubscribePablo = onSnapshot(qPablo, (snapshot) => {
    containerPablo.innerHTML = "";

    // separa por status
    const pendentes = [];
    const aguardando = [];
    snapshot.docs.forEach(docSnap => {
      const d = docSnap.data();
      if (d.status === 'pendente') pendentes.push(docSnap);
      else aguardando.push(docSnap);
    });

    // ordena por criadoEm e renderiza pendentes com posição
    pendentes.sort((a, b) => {
      const t1 = a.data().criadoEm?.seconds || 0;
      const t2 = b.data().criadoEm?.seconds || 0;
      return t1 - t2;
    }).forEach((docSnap, index) => {
      const data = docSnap.data();
      const horarioCompleto = new Date(data.criadoEm?.seconds * 1000 || Date.now());
      const horarioFormatado = horarioCompleto.toLocaleTimeString("pt-BR", { hour12: false }) + '.' + (data.criadoEm?.nanoseconds || '000000000');
      data.posicao = index + 1; // só pendentes entram na fila
      data.horarioFormatado = horarioFormatado;
      renderAgendamento(data, containerPablo, docSnap.id);
    });

    // depois renderiza aguardando_pagamento SEM posição
    aguardando.sort((a, b) => {
      const t1 = a.data().criadoEm?.seconds || 0;
      const t2 = b.data().criadoEm?.seconds || 0;
      return t1 - t2;
    }).forEach((docSnap) => {
      const data = docSnap.data();
      const horarioCompleto = new Date(data.criadoEm?.seconds * 1000 || Date.now());
      const horarioFormatado = horarioCompleto.toLocaleTimeString("pt-BR", { hour12: false }) + '.' + (data.criadoEm?.nanoseconds || '000000000');
      data.posicao = null; // não exibe número na fila
      data.horarioFormatado = horarioFormatado;
      renderAgendamento(data, containerPablo, docSnap.id);
    });
  });

  // Somente ADMIN assina relatórios e garante criação do settings/app se necessário
  if (isAdminUser) {
    // garante criação do doc settings/app somente quando admin logado
    ensureSettingsDoc().catch(console.error);
    unsubscribeRelatorios = onSnapshot(collection(db, "relatorios"), gerarRelatorio);
  } else {
    const tbody = document.querySelector("#tabelaRelatorio tbody");
    if (tbody) tbody.innerHTML = "";
  }
});
// ===== FIM das assinaturas condicionais =====

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
