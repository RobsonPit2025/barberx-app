import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, query, where, setDoc, updateDoc, getDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
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
  document.body.classList.remove('menu-open');

  // Se for o painel de fila, esconde as filas até escolher o barbeiro
  if (id === "fila") {
    document.getElementById("filaYuri")?.classList.add("hidden");
    document.getElementById("filaPablo")?.classList.add("hidden");
  }
}
// Torna a função acessível no HTML
window.mostrarSecao = mostrarSecao;

// Função para mostrar a fila do barbeiro selecionado
function mostrarFilaBarbeiro(barbeiro) {
  // Esconde todas as filas
  document.getElementById("filaYuri")?.classList.add("hidden");
  document.getElementById("filaPablo")?.classList.add("hidden");

  // Mostra apenas a fila do barbeiro selecionado
  const secao = document.getElementById(`fila${barbeiro}`);
  if (secao) secao.classList.remove("hidden");
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
        alert('PIX confirmado. Cliente entrou na fila.');
      } catch (e) {
        console.error('Erro ao confirmar PIX:', e);
        alert('Não foi possível confirmar o PIX agora.');
      }
    });
  }
}

const qYuri = query(collection(db, "agendamentos"), where("barbeiro", "==", "Yuri"));
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

// Gerar relatório mensal
function gerarRelatorio(snapshot) {
  const resumo = {};

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const barbeiro = data.barbeiro?.toLowerCase();
    const dataObj = new Date(data.data);
    const mesAno = `${dataObj.getMonth() + 1}/${dataObj.getFullYear()}`;

    if (!resumo[mesAno]) {
      resumo[mesAno] = { yuri: 0, pablo: 0 };
    }

    if (barbeiro === "yuri") {
      resumo[mesAno].yuri++;
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
      <td>${dados.yuri}</td>
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
      renderAgendamento(data, containerYuri, docSnap.id);
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
  if (s.includes('yuri')) return 'Yuri';
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
function generateSlots(start,end,step){
  const out = [];
  const inc = Number(step || 35);
  if (!inc || inc <= 0) return out;

  const s = toMinutes(start);
  const e = toMinutes(end);
  const MIN_IN_DAY = 24 * 60; // 1440

  if (s <= e) {
    // janela no mesmo dia
    for (let t = s; t <= e; t += inc) out.push(toHHMM(t));
  } else {
    // janela atravessa a meia-noite (ex.: 21:00 -> 03:00)
    for (let t = s; t < MIN_IN_DAY; t += inc) out.push(toHHMM(t));
    for (let t = 0; t <= e; t += inc) out.push(toHHMM(t));
  }
  return out;
}

async function loadScheduleToUI(barberId) {
  if (!cfgStart || !cfgEnd || !cfgStep || !cfgOpen) return;
  const barber = normalizeBarberId(barberId);
  const id = (barber === 'Pablo') ? 'schedule_Pablo' : 'schedule_Yuri';
  try {
    const snap = await getDoc(doc(db, 'settings', id));
    const data = snap.exists() ? snap.data() : { open:true, slotStart:'09:30', slotEnd:'19:00', slotStep:35 };
    cfgStart.value = data.slotStart || '09:30';
    cfgEnd.value   = data.slotEnd   || '19:00';
    cfgStep.value  = String(data.slotStep || 35);
    cfgOpen.value  = String(Boolean(data.open));
    if (cfgLunchStart) cfgLunchStart.value = data.lunchStart || '';
    if (cfgLunchEnd)   cfgLunchEnd.value   = data.lunchEnd   || '';
  } catch (e) {
    console.warn('Não foi possível carregar configuração de horário:', e);
  }
}

async function renderSchedulePreview(){
  const box = document.getElementById('cfgPreview');
  if(!box) return;
  const barber = normalizeBarberId(cfgBarbeiro?.value||'');
  // carrega config atual exibida na UI
  const open = (cfgOpen?.value === 'true');
  const start = cfgStart?.value || '09:30';
  const end   = cfgEnd?.value   || '19:00';
  const step  = Number(cfgStep?.value || 35);
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

  // marca almoço como ocupado
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
  // carrega inicialmente
  loadScheduleToUI(cfgBarbeiro.value);
  renderSchedulePreview();
  // ao trocar barbeiro
  cfgBarbeiro.addEventListener('change', () => {
    loadScheduleToUI(cfgBarbeiro.value);
    renderSchedulePreview();
  });
  [cfgStart,cfgEnd,cfgStep,cfgOpen].forEach(el=>{
    if(el) el.addEventListener('change', ()=> renderSchedulePreview());
  });
  if (cfgDate) {
    if (!cfgDate.value) cfgDate.value = todayISO();
    cfgDate.addEventListener('change', ()=> renderSchedulePreview());
  }
}

if (btnSalvar) {
  btnSalvar.addEventListener('click', async () => {
    if (!isCurrentUserAdmin()) { alert('Apenas administradores.'); return; }
    // Validação mínima do passo (step)
    const stepVal = Number(cfgStep?.value || 35);
    if (!stepVal || stepVal <= 0) {
      alert('Intervalo inválido. Use um valor maior que 0.');
      return;
    }
    try {
      const barber = normalizeBarberId(cfgBarbeiro?.value);
      const id = (barber === 'Pablo') ? 'schedule_Pablo' : 'schedule_Yuri';
      await setDoc(doc(db, 'settings', id), {
        open: cfgOpen?.value === 'true',
        slotStart: cfgStart?.value || '09:30',
        slotEnd:   cfgEnd?.value   || '19:00',
        slotStep:  stepVal,
        lunchStart: (cfgLunchStart?.value || '').trim() || null,
        lunchEnd:   (cfgLunchEnd?.value   || '').trim() || null
      }, { merge: true });
      alert('Configuração de horários salva!');
      renderSchedulePreview();
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
