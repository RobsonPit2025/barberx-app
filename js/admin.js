// ==============================
// Funções auxiliares de gerenciamento de locks
// ==============================

// Libera um lock específico pelo ID do documento
async function releaseLockForData(lockId) {
  try {
    const lockRef = doc(db, "slot_locks", lockId);
    await deleteDoc(lockRef);
    console.log(`[ADMIN] Lock ${lockId} liberado com sucesso.`);
  } catch (error) {
    console.error("[ADMIN] Erro ao liberar lock:", error);
    throw error;
  }
}

// Força liberação de lock com base em campos específicos (ex: horário e data)
async function forceReleaseByFields(field, value) {
  try {
    const q = query(collection(db, "slot_locks"), where(field, "==", value));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (docSnap) => {
      await deleteDoc(doc(db, "slot_locks", docSnap.id));
      console.log(`[ADMIN] Lock removido: ${docSnap.id}`);
    });
  } catch (error) {
    console.error("[ADMIN] Erro ao forçar liberação de lock:", error);
    throw error;
  }
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, query, where, setDoc, updateDoc, getDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getDocFromServer } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging.js";

function mostrarSecao(id) {
  console.log("Mostrando seção:", id);
  document.querySelectorAll('.painel').forEach(painel => {
    painel.classList.add('hidden');
  });

  const secaoAtiva = document.getElementById(id);
  if (secaoAtiva) {
    secaoAtiva.classList.remove('hidden');
  }
  document.body.classList.remove('menu-open');

  // Se for o painel de fila, esconde as filas até escolher o barbeiro
  if (id === "fila") {
    document.getElementById("filaYure")?.classList.add("hidden");
    document.getElementById("filaPablo")?.classList.add("hidden");
  }
}
// Torna a função acessível no HTML
window.mostrarSecao = mostrarSecao;

function mostrarFilaBarbeiro(barbeiro) {
  // Remove classe 'aberta' de todas as filas antes de esconder
  document.querySelectorAll('.painel-fila').forEach(el => el.classList.remove('aberta'));
  // Esconde todas as filas
  document.getElementById("filaYure")?.classList.add("hidden");
  document.getElementById("filaPablo")?.classList.add("hidden");

  // Mostra apenas a fila do barbeiro selecionado
  const secao = document.getElementById(`fila${barbeiro}`);
  if (!secao) return;
  secao.classList.remove("hidden");
  secao.classList.add("aberta");

  // Define o container correto
  const container =
    barbeiro === "Yure"
      ? document.getElementById("agendamentosYure")
      : document.getElementById("agendamentosPablo");

  if (!container) return;

  // Limpa o conteúdo anterior
  container.innerHTML = "<p>Carregando agendamentos...</p>";

  // Busca em tempo real os agendamentos desse barbeiro
  const q = query(
    collection(db, "agendamentos"),
    where("barbeiro", "==", barbeiro)
  );

  // Cancela listeners anteriores se existirem
  if (window.unsubscribeFilaAtual) {
    try {
      window.unsubscribeFilaAtual();
    } catch (e) {}
  }

  window.unsubscribeFilaAtual = onSnapshot(
    q,
    (snapshot) => {
      container.innerHTML = "";

      if (snapshot.empty) {
        container.innerHTML =
          "<p>Nenhum agendamento encontrado para este barbeiro.</p>";
        return;
      }

      const docsOrdenados = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          (d) => d.status === "pendente" || d.status === "aguardando_pagamento"
        )
        .sort((a, b) => {
          const t1 = scheduleTsFromData(a);
          const t2 = scheduleTsFromData(b);
          return t1 - t2;
        });

      if (docsOrdenados.length === 0) {
        container.innerHTML =
          "<p>Nenhum agendamento pendente para este barbeiro.</p>";
        return;
      }

      docsOrdenados.forEach((data, index) => {
        if (data.status === "pendente") {
          data.posicao = index + 1;
        } else {
          data.posicao = null;
        }
        data.horarioFormatado = new Date(
          data.criadoEm?.seconds * 1000 || Date.now()
        ).toLocaleTimeString("pt-BR", { hour12: false });
        renderAgendamento(data, container, data.id);
      });
    },
    (error) => {
      console.error("Erro ao carregar agendamentos:", error);
      container.innerHTML =
        "<p>Erro ao carregar agendamentos. Verifique o console.</p>";
    }
  );
}
window.mostrarFilaBarbeiro = mostrarFilaBarbeiro;

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCnsA89psIo30sQdBM9wFFzydnfOLcOKIc",
  authDomain: "barbex-app.firebaseapp.com",
  projectId: "barbex-app",
  storageBucket: "barbex-app.appspot.com",
  messagingSenderId: "91864465722",
  appId: "1:91864465722:web:7a3365582f3ca63e19d003"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);



const auth = getAuth(app);

// --- Admins autorizados para abrir/fechar agendamentos ---
const ADMINS = [
  "admin1@barberx.com",
  "admin2@barberx.com"
];

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
const containerYure = document.getElementById("agendamentosYure");
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
    <p><strong>Marcado para:</strong> ${dados.horario || '-'}${dados.dataDia ? ` — ${dados.dataDia}` : ''}</p>
    <p><small>Criado às: ${horaFormatada}</small></p>

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
      ${dados.paymentStatus !== 'paid' ? `<button class="btn-nao-comprovado" data-id="${id}">Não comprovado</button>` : ''}
      <button class="btn-remover" data-id="${id}">Remover</button>
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

      // Libera lock do horário (candidatos -> fallback por campos)
      try {
        let r = await releaseLockForData(dados);
        if (r < 1) r += await forceReleaseByFields(dados.barbeiro, dados.dataDia, dados.horario);
        if (r < 1) r += await forceReleaseByUser(dados.userId, (dados.email||dados.userEmail), dados.dataDia, dados.horario);
        if (r < 1) console.warn('Nenhum lock encontrado para liberar (concluir):', dados);
      } catch(e) { console.warn('Falha ao liberar lock (concluir):', e); }
      // Remover da fila de agendamentos
      await deleteDoc(doc(db, "agendamentos", id));
      console.log("Agendamento finalizado e registrado.");
    } catch (error) {
      console.error("Erro ao concluir corte:", error);
    }
  });

  // Botão Não comprovado (libera horário sem excluir o doc)
  const btnNC = div.querySelector('.btn-nao-comprovado');
  if (btnNC) {
    btnNC.addEventListener('click', async () => {
      if (!isCurrentUserAdmin()) { alert('Apenas administradores.'); return; }
      try {
        await updateDoc(doc(db, 'agendamentos', id), {
          status: 'nao_comprovado',
          paymentStatus: 'failed',
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser ? (auth.currentUser.email || auth.currentUser.uid) : 'admin'
        });
        try {
          let r = await releaseLockForData(dados);
          if (r < 1) r += await forceReleaseByFields(dados.barbeiro, dados.dataDia, dados.horario);
          if (r < 1) r += await forceReleaseByUser(dados.userId, (dados.email||dados.userEmail), dados.dataDia, dados.horario);
          if (r < 1) console.warn('Nenhum lock encontrado para liberar (nao_comprovado):', dados);
        } catch(e) { console.warn('Falha ao liberar lock (nao_comprovado):', e); }
        alert('Marcado como NÃO COMPROVADO. O horário foi liberado.');
        // Envia notificação ao cliente informando que o pagamento não foi comprovado
        try {
          const userTokenRef = doc(db, 'user_tokens', dados.userId);
          const userTokenSnap = await getDoc(userTokenRef);
          if (userTokenSnap.exists()) {
            const clientToken = userTokenSnap.data().token;
            const response = await fetch('https://us-central1-barbex-app.cloudfunctions.net/sendNotification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: clientToken,
                title: 'Pagamento PIX não comprovado ⚠️',
                body: 'Seu pagamento não foi confirmado. Verifique e tente novamente.'
              })
            });
            if (!response.ok) {
              const text = await response.text();
              console.warn('Falha ao enviar notificação de não comprovado:', text);
            }
          }
        } catch (err) {
          console.error('Erro ao enviar notificação de não comprovado:', err);
        }
      } catch (e) {
        console.error('Erro ao marcar não comprovado:', e);
        alert('Não foi possível marcar como não comprovado agora.');
      }
    });
  }

  // Botão Remover agendamento (libera horário e remove o doc)
  const btnRem = div.querySelector('.btn-remover');
  if (btnRem) {
    btnRem.addEventListener('click', async () => {
      if (!isCurrentUserAdmin()) { alert('Apenas administradores.'); return; }
      if (!confirm('Remover este agendamento? Isso liberará o horário.')) return;
      try {
        const ref = doc(db, 'agendamentos', id);
        // Buscar dados atuais do agendamento uma vez
        let snap; let dataForRelease = dados; // fallback aos dados da renderização
        try {
          snap = await getDoc(ref);
          if (snap && snap.exists()) {
            dataForRelease = snap.data();
            // Registrar no Firestore (coleção relatorios) — opcional
            try {
              await addDoc(collection(db, 'relatorios'), {
                tipo: 'removido',
                motivo: 'no_show',
                agendamentoId: id,
                barbeiro: dataForRelease.barbeiro || '',
                dataDia: dataForRelease.dataDia || '',
                horario: dataForRelease.horario || '',
                cliente: dataForRelease.nome || '',
                createdAt: serverTimestamp(),
                by: auth.currentUser ? (auth.currentUser.email || auth.currentUser.uid) : 'admin'
              });
            } catch (_) { /* relatório é opcional */ }
          }
        } catch (_) { /* leitura opcional */ }

        // Libera lock do horário ANTES de remover o agendamento
        try {
          let r = await releaseLockForData(dataForRelease);
          if (r < 1) r += await forceReleaseByFields(dataForRelease.barbeiro, dataForRelease.dataDia, dataForRelease.horario);
          if (r < 1) r += await forceReleaseByUser(dataForRelease.userId, (dataForRelease.email||dataForRelease.userEmail), dataForRelease.dataDia, dataForRelease.horario);
          if (r < 1) console.warn('Nenhum lock encontrado para liberar (remover-pre):', dataForRelease);
        } catch(e) { console.warn('Falha ao liberar lock (remover-pre):', e); }

        // Remove o agendamento
        await deleteDoc(ref);

        // Fallback defensivo pós-remoção (caso ainda tenha sobrado lock por divergência de ID)
        try {
          let r = await forceReleaseByFields(dataForRelease.barbeiro, dataForRelease.dataDia, dataForRelease.horario);
          if (r < 1) r += await forceReleaseByUser(dataForRelease.userId, (dataForRelease.email||dataForRelease.userEmail), dataForRelease.dataDia, dataForRelease.horario);
          if (r < 1) console.warn('Nenhum lock encontrado para liberar (remover-pos):', dataForRelease);
        } catch(e) { console.warn('Falha ao liberar lock (remover-pos):', e); }

        alert('Agendamento removido. O horário foi liberado.');
      } catch (e) {
        console.error('Erro ao remover agendamento:', e);
        alert('Não foi possível remover agora.');
      }
    });
  }

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

        // Busca o token do cliente
        const userTokenRef = doc(db, 'user_tokens', dados.userId);
        const userTokenSnap = await getDoc(userTokenRef);

        if (userTokenSnap.exists()) {
          const clientToken = userTokenSnap.data().token;
          try {
            const response = await fetch('https://us-central1-barbex-app.cloudfunctions.net/sendNotification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: clientToken,
                title: 'Pagamento PIX confirmado 💈',
                body: 'Seu pagamento foi confirmado! Você entrou na fila do barbeiro.'
              })
            });

            if (!response.ok) {
              const text = await response.text();
              console.warn('Falha ao enviar notificação:', text);
            }
          } catch (err) {
            console.error('Erro ao tentar enviar notificação:', err);
          }
        } else {
          console.warn('Token do cliente não encontrado para o agendamento', id);
        }

        console.log('PIX confirmado e notificação enviada ao cliente.');
        alert('PIX confirmado com sucesso.');
      } catch (e) {
        console.error('Erro ao confirmar PIX e enviar notificação:', e);
        alert('Não foi possível confirmar o PIX agora.');
      }
    });
  }
}

const qYure = query(collection(db, "agendamentos"), where("barbeiro", "==", "Yure"));
const qPablo = query(collection(db, "agendamentos"), where("barbeiro", "==", "Pablo"));

// Timestamp de ordenação baseado no horário AGENDADO (dataDia + horario)
function scheduleTsFromData(data){
  // Prioriza dataDia (YYYY-MM-DD) + horario (HH:MM)
  if (data && data.dataDia && data.horario) {
    // Monta string local; se for inválida, cai no fallback abaixo
    const iso = `${data.dataDia}T${(data.horario || '00:00')}:00`;
    const d = new Date(iso);
    const t = d.getTime();
    if (Number.isFinite(t)) return t;
  }
  // Fallbacks (ordenação antiga por criação)
  if (data && data.criadoEm && typeof data.criadoEm.seconds === 'number') {
    // inclui nanos para desempate estável
    const ns = typeof data.criadoEm.nanoseconds === 'number' ? data.criadoEm.nanoseconds : 0;
    return data.criadoEm.seconds * 1000 + Math.floor(ns / 1e6);
  }
  if (data && data.timestamp && typeof data.timestamp.seconds === 'number') {
    return data.timestamp.seconds * 1000;
  }
  return 0;
}

// Novo relatório detalhado com filtros de mês e dia
async function gerarRelatorioDetalhado() {
  const relatorioContainer = document.getElementById("relatorioContainer");
  if (!relatorioContainer) return;

  // Cria o seletor de mês e dia se ainda não existir
  if (!document.getElementById("filtroMes")) {
    relatorioContainer.innerHTML = `
      <div style="margin-bottom: 10px;">
        <label>Mês:</label>
        <input type="month" id="filtroMes" style="margin-right: 10px;">
        <label>Dia:</label>
        <input type="date" id="filtroDia" style="margin-right: 10px;">
        <button id="btnFiltrarRelatorio">Filtrar</button>
      </div>
      <table class="tabela-relatorio-detalhado">
        <thead>
          <tr>
            <th>Data</th>
            <th>Cliente</th>
            <th>Barbeiro</th>
            <th>Valor Pago</th>
          </tr>
        </thead>
        <tbody id="tabelaRelatorioDetalhado"></tbody>
      </table>
    `;
  }

  const btn = document.getElementById("btnFiltrarRelatorio");
  btn.addEventListener("click", async () => {
    const mesSelecionado = document.getElementById("filtroMes").value;
    const diaSelecionado = document.getElementById("filtroDia").value;
    const tbody = document.getElementById("tabelaRelatorioDetalhado");
    tbody.innerHTML = "<tr><td colspan='4'>Carregando...</td></tr>";

    try {
      let q = collection(db, "relatorios");
      let snapshot = await getDocs(q);
      let dados = snapshot.docs.map(doc => doc.data()).filter(item => item.status === "concluido");

      // Filtra por mês e dia
      if (mesSelecionado) {
        const [ano, mes] = mesSelecionado.split("-");
        dados = dados.filter(item => {
          const data = new Date(item.createdAt?.seconds * 1000);
          return data.getFullYear() == ano && (data.getMonth() + 1) == mes;
        });
      }

      if (diaSelecionado) {
        dados = dados.filter(item => {
          const data = new Date(item.createdAt?.seconds * 1000);
          const diaISO = data.toISOString().split("T")[0];
          return diaISO === diaSelecionado;
        });
      }

      // Atualiza tabela
      tbody.innerHTML = "";
      if (dados.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4'>Nenhum corte encontrado nesse período.</td></tr>";
        return;
      }

      dados.forEach(item => {
        const data = new Date(item.createdAt?.seconds * 1000);
        const dataFormatada = data.toLocaleDateString("pt-BR");
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${dataFormatada}</td>
          <td>${item.nome || "-"}</td>
          <td>${item.barbeiro || "-"}</td>
          <td>R$ ${(item.amount || 0).toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (e) {
      console.error("Erro ao gerar relatório detalhado:", e);
    }
  });
}

// ===== Assinaturas condicionais após autenticação =====
let unsubscribeYure = null;
let unsubscribePablo = null;
let unsubscribeRelatorios = null;

onAuthStateChanged(auth, (user) => {
  // Cancela assinaturas anteriores
  if (unsubscribeYure) { try { unsubscribeYure(); } catch(e) {} unsubscribeYure = null; }
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
  unsubscribeYure = onSnapshot(qYure, (snapshot) => {
    containerYure.innerHTML = "";

    // separa por status
    const pendentes = [];
    const aguardando = [];
    snapshot.docs.forEach(docSnap => {
      const d = docSnap.data();
      if (d.status === 'pendente') pendentes.push(docSnap);
      else aguardando.push(docSnap);
    });

    // ordena por novo helper e renderiza pendentes com posição
    pendentes.sort((a, b) => {
      const t1 = scheduleTsFromData(a.data());
      const t2 = scheduleTsFromData(b.data());
      return t1 - t2;
    }).forEach((docSnap, index) => {
      const data = docSnap.data();
      const horarioCompleto = new Date(data.criadoEm?.seconds * 1000 || Date.now());
      const horarioFormatado = horarioCompleto.toLocaleTimeString("pt-BR", { hour12: false }) + '.' + (data.criadoEm?.nanoseconds || '000000000');
      data.posicao = index + 1; // só pendentes entram na fila
      data.horarioFormatado = horarioFormatado;
      renderAgendamento(data, containerYure, docSnap.id);
    });

    // depois renderiza aguardando_pagamento SEM posição
    aguardando.sort((a, b) => {
      const t1 = scheduleTsFromData(a.data());
      const t2 = scheduleTsFromData(b.data());
      return t1 - t2;
    }).forEach((docSnap) => {
      const data = docSnap.data();
      const horarioCompleto = new Date(data.criadoEm?.seconds * 1000 || Date.now());
      const horarioFormatado = horarioCompleto.toLocaleTimeString("pt-BR", { hour12: false }) + '.' + (data.criadoEm?.nanoseconds || '000000000');
      data.posicao = null; // não exibe número na fila
      data.horarioFormatado = horarioFormatado;
      renderAgendamento(data, containerYure, docSnap.id);
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

    // ordena por novo helper e renderiza pendentes com posição
    pendentes.sort((a, b) => {
      const t1 = scheduleTsFromData(a.data());
      const t2 = scheduleTsFromData(b.data());
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
      const t1 = scheduleTsFromData(a.data());
      const t2 = scheduleTsFromData(b.data());
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

  // Somente ADMIN ativa relatório detalhado e garante criação do settings/app se necessário
  if (isAdminUser) {
    ensureSettingsDoc().catch(console.error);
    gerarRelatorioDetalhado();
  } else {
    // Se não for admin, pode limpar o relatório se desejar (ajustar conforme necessário)
    const relatorioContainer = document.getElementById("relatorioContainer");
    if (relatorioContainer) relatorioContainer.innerHTML = "";
  }
});
// ===== FIM das assinaturas condicionais =====

// ===== Configuração de horários (Admin) =====
const cfgBarbeiro = document.getElementById('cfgBarbeiro');
const cfgStart    = document.getElementById('cfgStart');
const cfgEnd      = document.getElementById('cfgEnd');
const cfgStep     = document.getElementById('cfgStep');
const cfgOpen     = document.getElementById('cfgOpen');
const btnSalvar   = document.getElementById('btnSalvarHorario');
const cfgDate    = document.getElementById('cfgDate');
const cfgLunchStart = document.getElementById('cfgLunchStart');
const cfgLunchEnd   = document.getElementById('cfgLunchEnd');

// Cache local para o status aberto/fechado de cada barbeiro
const barberStatusCache = {};

// Função para exibir campos progressivamente na configuração de horários (NOVO FLUXO)
function atualizarVisibilidadeCampos() {
  // Helper para obter o contêiner apropriado do campo
  const getEl = (el, divId) => {
    if (!el) return null;
    if (divId && document.getElementById(divId)) return document.getElementById(divId);
    if (el.parentElement && el.parentElement.classList.contains("form-group")) return el.parentElement;
    return el;
  };

  // Elementos ou contêineres dos campos
  const elBarbeiro   = getEl(cfgBarbeiro, "cfgBarbeiroDiv");
  const elOpen       = getEl(cfgOpen, "cfgOpenDiv");
  const elStart      = getEl(cfgStart, "cfgStartDiv");
  const elLunchStart = getEl(cfgLunchStart, "cfgLunchStartDiv");
  const elLunchEnd   = getEl(cfgLunchEnd, "cfgLunchEndDiv");
  const elEnd        = getEl(cfgEnd, "cfgEndDiv");
  const elStep       = getEl(cfgStep, "cfgStepDiv");
  const elBtnSalvar  = getEl(btnSalvar, "btnSalvarHorarioDiv");

  // Sempre fecha todos os campos (menos barbeiro e status) no início
  if (elStart)      elStart.classList.add('hidden');
  if (elLunchStart) elLunchStart.classList.add('hidden');
  if (elLunchEnd)   elLunchEnd.classList.add('hidden');
  if (elEnd)        elEnd.classList.add('hidden');
  if (elStep)       elStep.classList.add('hidden');
  if (elBtnSalvar)  elBtnSalvar.classList.add('hidden');

  // Etapa 1: apenas barbeiro e status visíveis inicialmente
  if (elBarbeiro) elBarbeiro.classList.remove('hidden');
  if (elOpen)     elOpen.classList.remove('hidden');

  // Checagem consistente dos valores reais do select de status e barbeiro
  const barbeiroSelecionado = cfgBarbeiro && cfgBarbeiro.value && cfgBarbeiro.value.trim() !== "";
  const statusValue = cfgOpen ? cfgOpen.value : "";
  const aberto = statusValue === "true";
  const statusSelecionado = statusValue === "true" || statusValue === "false";
  // Se status estiver fechado ou indefinido, esconde tudo imediatamente
  if (!aberto || !statusSelecionado) {
    // Garante que todos os campos (exceto barbeiro e status) estejam escondidos
    if (elStart)      elStart.classList.add('hidden');
    if (elLunchStart) elLunchStart.classList.add('hidden');
    if (elLunchEnd)   elLunchEnd.classList.add('hidden');
    if (elEnd)        elEnd.classList.add('hidden');
    if (elStep)       elStep.classList.add('hidden');
    if (elBtnSalvar)  elBtnSalvar.classList.add('hidden');
    return;
  }

  // Somente se barbeiro selecionado E status = aberto, mostrar os próximos campos
  if (barbeiroSelecionado && aberto) {
    // Mostra início
    if (elStart) elStart.classList.remove('hidden');
    if (cfgStart && cfgStart.value) {
      // Mostra almoço início
      if (elLunchStart) elLunchStart.classList.remove('hidden');
      if (cfgLunchStart && cfgLunchStart.value) {
        // Mostra almoço fim
        if (elLunchEnd) elLunchEnd.classList.remove('hidden');
        if (cfgLunchEnd && cfgLunchEnd.value) {
          // Mostra fim
          if (elEnd) elEnd.classList.remove('hidden');
          if (cfgEnd && cfgEnd.value) {
            // Mostra intervalo
            if (elStep) elStep.classList.remove('hidden');
            const validStep = cfgStep && cfgStep.value && Number(cfgStep.value) > 0;
            if (validStep) {
              // Mostra botão salvar
              if (elBtnSalvar) elBtnSalvar.classList.remove('hidden');
            }
          }
        }
      }
    }
  }
}


// --- UI extra: seleção de almoço por clique na pré-visualização + botão limpar ---
const cfgPreviewEl = document.getElementById('cfgPreview');

// cria o botão "Limpar almoço" dinamicamente se não existir no HTML
let btnClearLunch = document.getElementById('btnClearLunch');
if (!btnClearLunch && cfgLunchEnd && cfgLunchEnd.parentNode) {
  btnClearLunch = document.createElement('button');
  btnClearLunch.id = 'btnClearLunch';
  btnClearLunch.type = 'button';
  btnClearLunch.textContent = 'Limpar almoço';
  btnClearLunch.style.marginLeft = '8px';
  cfgLunchEnd.parentNode.insertBefore(btnClearLunch, cfgLunchEnd.nextSibling);
}

if (btnClearLunch) {
  btnClearLunch.addEventListener('click', () => {
    if (cfgLunchStart) cfgLunchStart.value = '';
    if (cfgLunchEnd)   cfgLunchEnd.value = '';
    renderSchedulePreview();
  });
}

// Permite escolher o intervalo de almoço clicando em dois horários na pré-visualização
if (cfgPreviewEl) {
  cfgPreviewEl.addEventListener('click', (ev) => {
    const slot = ev.target.closest('[data-hh]');
    if (!slot) return;
    const hh = slot.getAttribute('data-hh');
    if (!hh) return;

    // 1º clique define início; 2º clique define fim (ordena automaticamente)
    const curStart = (cfgLunchStart?.value || '').trim();
    const curEnd   = (cfgLunchEnd?.value   || '').trim();

    if (!curStart) {
      if (cfgLunchStart) cfgLunchStart.value = hh;
      if (cfgLunchEnd)   cfgLunchEnd.value = '';
    } else if (!curEnd) {
      // segundo clique
      const s = toMinutes(curStart), e = toMinutes(hh);
      if (Number.isFinite(s) && Number.isFinite(e)) {
        if (e >= s) {
          if (cfgLunchEnd) cfgLunchEnd.value = hh;
        } else {
          // se clicou um horário anterior, inverte
          if (cfgLunchStart) cfgLunchStart.value = hh;
          if (cfgLunchEnd)   cfgLunchEnd.value = curStart;
        }
      } else {
        if (cfgLunchEnd) cfgLunchEnd.value = hh;
      }
    } else {
      // já tinha os dois – reinicia seleção, começando pelo novo clique
      if (cfgLunchStart) cfgLunchStart.value = hh;
      if (cfgLunchEnd)   cfgLunchEnd.value = '';
    }

    renderSchedulePreview();
  });
}

function normalizeBarberId(v){
  if(!v) return '';
  const s = String(v).toLowerCase();
  if (s.includes('yure')) return 'Yure';
  if (s.includes('pablo')) return 'Pablo';
  return v;
}
function todayISO(){
  const d=new Date();
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function selectedDateISO(){
  if (!cfgDate || !cfgDate.value) return todayISO();
  return cfgDate.value;
}
function toMinutes(hhmm){
  const [h,m]=(hhmm||'00:00').split(':').map(Number);
  return h*60+m;
}
function toHHMM(mins){
  const h=Math.floor(mins/60), m=mins%60;
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
}
function generateSlots(start, end, step) {
  const out = [];
  const inc = Number(step || 35);
  if (!inc || inc <= 0) return out;

  const s = toMinutes(start);
  let e = toMinutes(end);
  const MIN_IN_DAY = 24 * 60; // 1440 minutos

  // Se o fim for 00:00, tratar como 24:00 (meia-noite do mesmo dia)
  if (e === 0 && start !== "00:00") e = MIN_IN_DAY;

  // Caso o fim seja menor que o início → cruza a meia-noite
  if (e < s) {
    for (let t = s; t < MIN_IN_DAY; t += inc) out.push(toHHMM(t));
    for (let t = 0; t <= e; t += inc) out.push(toHHMM(t));
  } else {
    for (let t = s; t <= e; t += inc) {
      // Garante que o último horário sempre apareça mesmo se o intervalo não encaixar exatamente
      if (t + inc > e && t !== e) out.push(toHHMM(e));
      else out.push(toHHMM(t));
    }
  }

  // Remove duplicações e horários inválidos
  return Array.from(new Set(out.filter(h => {
    const [hh, mm] = h.split(":").map(Number);
    return hh >= 0 && hh < 24 && mm >= 0 && mm < 60;
  })));
}

async function loadScheduleToUI(barberId) {
  if (!cfgStart || !cfgEnd || !cfgStep || !cfgOpen) return;
  const barber = normalizeBarberId(barberId);
  // Checa o cache local de status aberto/fechado
  if (barberStatusCache.hasOwnProperty(barber)) {
    cfgOpen.value = String(barberStatusCache[barber]);
  }
  const id = (barber === 'Pablo') ? 'schedule_Pablo' : 'schedule_Yure';
  try {
    const snap = await getDocFromServer(doc(db, 'settings', id));
    const data = snap.exists() ? snap.data() : { open:true, slotStart:'09:30', slotEnd:'19:00', slotStep:35 };
    cfgStart.value = data.slotStart || '09:30';
    cfgEnd.value   = data.slotEnd   || '19:00';
    cfgStep.value  = String(data.slotStep || 35);
    // Sempre define o valor real do status do barbeiro selecionado
    cfgOpen.value = String(Boolean(data.open));
    // Atualiza o cache local com o status do barbeiro
    barberStatusCache[barber] = data.open;
    if (cfgLunchStart) cfgLunchStart.value = data.lunchStart || '';
    if (cfgLunchEnd)   cfgLunchEnd.value   = data.lunchEnd   || '';

    // Garante que os campos de almoço existam no Firestore
    if (!('lunchStart' in data) || !('lunchEnd' in data)) {
      await setDoc(doc(db, 'settings', id), {
        lunchStart: data.lunchStart || '',
        lunchEnd: data.lunchEnd || ''
      }, { merge: true });
    }
  } catch (e) {
    console.warn('Não foi possível carregar configuração de horário:', e);
  }
  // Garante atualização da visibilidade após carregar os dados do barbeiro
  atualizarVisibilidadeCampos();
}

// Refatoração: renderSchedulePreview carrega os dados atuais do barbeiro antes de renderizar,
// e usa lunchStart/lunchEnd específicos de cada barbeiro.
async function renderSchedulePreview(){
  const box = document.getElementById('cfgPreview');
  if(!box) return;
  const barber = normalizeBarberId(cfgBarbeiro?.value||'');
  // Removido o carregamento automático do Firestore para não sobrescrever os valores recém-definidos

  // Após loadScheduleToUI, os valores dos inputs já estão atualizados para o barbeiro correto.
  const open = (cfgOpen?.value === 'true');
  const start = cfgStart?.value || '09:30';
  const end   = cfgEnd?.value   || '19:00';
  const step  = Number(cfgStep?.value || 35);
  // lunchStart/lunchEnd agora são lidos dos inputs, que foram atualizados para o barbeiro correto
  const lunchStart = (cfgLunchStart?.value || '').trim();
  const lunchEnd   = (cfgLunchEnd?.value || '').trim();

  box.innerHTML = '';
  if(!open){
    box.innerHTML = '<div style="opacity:.7">(Fechado — nenhuma faixa liberada)</div>';
    return;
  }

  const slots = generateSlots(start,end,step);

  // busca horários ocupados hoje
  const ocupados = new Set();
  try{
    const q1 = query(collection(db,'agendamentos'),
      where('barbeiro','==', barber),
      where('dataDia','==', selectedDateISO()),
      where('status','in',['aguardando_pagamento','pendente'])
    );
    const snap = await getDocs(q1);
    snap.forEach(ds=> ocupados.add(ds.data().horario));
  }catch(_e){
    // fallback sem 'in'
    const estados=['aguardando_pagamento','pendente'];
    for(const st of estados){
      const q2 = query(collection(db,'agendamentos'),
        where('barbeiro','==', barber),
        where('dataDia','==', selectedDateISO()),
        where('status','==', st)
      );
      const s2 = await getDocs(q2);
      s2.forEach(ds=> ocupados.add(ds.data().horario));
    }
  }

  // Marca almoço como ocupado baseado nos inputs do barbeiro selecionado
  const almoco = new Set();
  if (lunchStart && lunchEnd) {
    const ls = toMinutes(lunchStart);
    const le = toMinutes(lunchEnd);
    // Considera janela tradicional (sem cruzar madrugada)
    if (Number.isFinite(ls) && Number.isFinite(le)) {
      // Preenche com o mesmo passo da grade
      const inc = Number(step || 35);
      if (inc > 0) {
        if (ls <= le) {
          for (let t = ls; t <= le; t += inc) almoco.add(toHHMM(t)); // inclui o horário final
        } else {
          // caso raro: almoço cruza meia-noite
          for (let t = ls; t < 1440; t += inc) almoco.add(toHHMM(t));
          for (let t = 0; t <= le; t += inc) almoco.add(toHHMM(t)); // inclui o horário final
        }
      }
    }
  }

  // garante que almoco também reflita os valores atuais dos inputs (caso venham de cliques)
  if ((cfgLunchStart?.value || '') && (cfgLunchEnd?.value || '')) {
    almoco.clear();
    const ls = toMinutes(cfgLunchStart.value);
    const le = toMinutes(cfgLunchEnd.value);
    const inc = Number(step || 35);
    if (Number.isFinite(ls) && Number.isFinite(le) && inc > 0) {
      if (ls <= le) {
        for (let t = ls; t <= le; t += inc) almoco.add(toHHMM(t)); // inclui o horário final
      } else {
        for (let t = ls; t < 1440; t += inc) almoco.add(toHHMM(t));
        for (let t = 0; t <= le; t += inc) almoco.add(toHHMM(t)); // inclui o horário final
      }
    }
  }

  // monta grade
  for (const hh of slots) {
    const isLunch = almoco.has(hh);
    const taken = isLunch || ocupados.has(hh);
    const item = document.createElement('div');
    item.textContent = hh + (isLunch ? ' (almoço)' : (taken ? ' (ocupado)' : ''));
    item.style.padding = '8px';
    item.style.border = '1px solid #e5e7eb';
    item.style.borderRadius = '8px';
    item.style.textAlign = 'center';
    item.style.cursor = 'pointer';
    item.setAttribute('data-hh', hh);
    if (taken) { item.style.opacity = '.45'; item.style.background = '#f3f4f6'; }
    if (isLunch) { item.style.borderStyle = 'dashed'; item.style.background = '#fff7ed'; }
    box.appendChild(item);
  }
}

if (cfgBarbeiro) {
  // carrega inicialmente e renderiza preview após garantir config correta do barbeiro
  (async () => {
    await loadScheduleToUI(cfgBarbeiro.value);
    await renderSchedulePreview();
  })();
  // ao trocar barbeiro
  cfgBarbeiro.addEventListener('change', async () => {
    await loadScheduleToUI(cfgBarbeiro.value);
    await renderSchedulePreview();
    // atualizarVisibilidadeCampos será chamada no final de loadScheduleToUI
  });
  // Listener para o campo de status (aberto/fechado) com gravação automática no Firestore
  if (cfgOpen) {
    cfgOpen.addEventListener('change', async () => {
      atualizarVisibilidadeCampos();
      try {
        const barber = normalizeBarberId(cfgBarbeiro?.value);
        const id = (barber === 'Pablo') ? 'schedule_Pablo' : 'schedule_Yure';
        await setDoc(doc(db, 'settings', id), {
          open: cfgOpen.value === 'true'
        }, { merge: true });
        // Atualiza o cache local após salvar no Firestore
        barberStatusCache[normalizeBarberId(cfgBarbeiro?.value)] = cfgOpen.value === 'true';
        console.log(`Status de ${barber} salvo automaticamente como ${cfgOpen.value === 'true' ? 'ABERTO' : 'FECHADO'}`);
      } catch (e) {
        console.error('Erro ao salvar status automaticamente:', e);
      }
    });
  }
  [cfgStart, cfgLunchStart, cfgLunchEnd, cfgEnd, cfgStep].forEach(el => {
    if (el) el.addEventListener('change', async () => {
      await renderSchedulePreview();
      atualizarVisibilidadeCampos();
    });
  });
  if (cfgDate) {
    if (!cfgDate.value) cfgDate.value = todayISO();
    cfgDate.addEventListener('change', async ()=> await renderSchedulePreview());
  }
}

if (btnSalvar) {
  btnSalvar.addEventListener('click', async () => {
    if (!isCurrentUserAdmin()) { alert('Apenas administradores.'); return; }

    const barber = normalizeBarberId(cfgBarbeiro?.value);
    if (!barber) { alert('Selecione um barbeiro.'); return; }

    const id = (barber === 'Pablo') ? 'schedule_Pablo' : 'schedule_Yure';
    const isOpen = cfgOpen?.value === 'true';
    const stepVal = Number(cfgStep?.value || 35);

    try {
      if (!isOpen) {
        // Quando o barbeiro for fechado, limpa toda a configuração
        await setDoc(doc(db, 'settings', id), {
          open: false,
          slotStart: '',
          slotEnd: '',
          slotStep: 0,
          lunchStart: '',
          lunchEnd: ''
        }, { merge: true });

        // Atualiza cache e reseta a UI
        barberStatusCache[barber] = false;
        cfgStart.value = '';
        cfgEnd.value = '';
        cfgStep.value = '';
        cfgLunchStart.value = '';
        cfgLunchEnd.value = '';
        alert(`O barbeiro ${barber} foi marcado como FECHADO e o horário foi resetado.`);
        await renderSchedulePreview();
        return;
      }

      // Se estiver aberto, valida os campos
      if (!cfgStart.value || !cfgEnd.value) {
        alert('Informe o horário de início e término.');
        return;
      }
      if (!stepVal || stepVal <= 0) {
        alert('Intervalo inválido. Use um valor maior que 0.');
        return;
      }

      // Salva a configuração completa
      await setDoc(doc(db, 'settings', id), {
        open: true,
        slotStart: cfgStart?.value || '09:30',
        slotEnd: cfgEnd?.value || '19:00',
        slotStep: stepVal,
        lunchStart: (cfgLunchStart?.value || '').trim(),
        lunchEnd: (cfgLunchEnd?.value || '').trim()
      }, { merge: true });

      barberStatusCache[barber] = true;
      alert(`Configuração de horários salva com sucesso para ${barber}!`);
      await loadScheduleToUI(cfgBarbeiro.value);
      await renderSchedulePreview();

    } catch (e) {
      console.error('Erro ao salvar configuração de horário:', e);
      alert('Não foi possível salvar agora.');
    }
  });
}

const btnPrev = document.getElementById('btnPreviewAtualizar');
if(btnPrev){ btnPrev.addEventListener('click', ()=> renderSchedulePreview()); }
// ===== FIM Configuração de horários (Admin) =====

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


// Fecha o menu automaticamente após clicar em qualquer botão do menu lateral
const menuButtons = document.querySelectorAll('.sidebar button, .sidebar a');
menuButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    document.body.classList.remove('menu-open');
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('active');
  });
});
