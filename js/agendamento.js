import { getFirestore, collection, doc, getDoc, setDoc, onSnapshot, updateDoc, addDoc, serverTimestamp, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// ===== Pagamento antecipado (metade/integral) — CLIENTE =====
document.addEventListener('DOMContentLoaded', function(){
  // ===== Configuração de serviços (provisório até a tabela oficial) =====
  // Quando a tabela chegar, podemos mover isso para o Firestore.
  const SERVICE_PRICES = {
    corte_maquina: 20.00,
    corte_navalhado: 20.00,
    corte_tesoura: 25.00,
    barba: 10.00,
    pe: 10.00,
    sobrancelha: 10.00,
    pigmentacao: 10.00,
    promocao_corte_barba: 25.00,
    promocao_corte_barba_pigmentacao: 30.00,
    promocao_corte_pigmentacao: 28.00,
    nevou_com_corte: 80.00,
    nevou_sem_corte: 60.00,
    luzes_com_corte: 60.00,
    luzes_sem_corte: 45.00,
    reflexo_alinhado_com_corte: 70.00
  };

  // ===== PIX por barbeiro =====
  const PIX_BY_BARBER = {
    Yuri: "71981218562",
    Pablo: "71981879989"
  };
  function normalizeBarberId(v){
    const s = (v || '').toString().toLowerCase();
    if (s.includes('yure') || s.includes('yuri')) return 'Yuri';
    if (s.includes('pablo')) return 'Pablo';
    return v;
  }

  // ===== Referências de UI =====
  const pagamentoBox = document.getElementById('pagamentoBox');
  const radios = document.querySelectorAll('input[name="payAmount"]');
  const valorSpan = document.getElementById('valorCalculado');
  const selectServico = document.getElementById('servico');
  const selectBarbeiro = document.getElementById('barbeiro');
  const pixKeyEl = document.getElementById('pixKey');
  const pixBox = document.getElementById('pixBox');

  // ===== Fila do cliente + bloqueio global =====
  const formAg = document.getElementById('formAgendamento') || document.querySelector('form');
  function setFormDisabled(disabled) {
    if (!formAg) return;
    formAg.querySelectorAll('input, select, textarea, button[type="submit"]').forEach(el => {
      el.disabled = !!disabled;
    });
  }

  // Caixa “Minha Fila” (cria se não existir) — mostrada quando o cliente já tem agendamento ativo
  let filaBox = document.getElementById('minhaFilaBox');
  if (!filaBox && formAg?.parentNode) {
    filaBox = document.createElement('div');
    filaBox.id = 'minhaFilaBox';
    filaBox.style.margin = '12px 0';
    filaBox.style.padding = '10px';
    filaBox.style.border = '1px solid #e5e7eb';
    filaBox.style.borderRadius = '8px';
    filaBox.style.display = 'none';
    formAg.parentNode.insertBefore(filaBox, formAg);
  }
  function showMinhaFila(docData) {
    if (!filaBox) return;
    const { barbeiro, horario, status, amountOption } = docData || {};

    let rot = '';
    if (status === 'pendente') {
      if (amountOption === 'half') {
        rot = 'Você se encontra (na fila). Falta pagar (metade) pessoalmente!';
      } else {
        rot = 'Você se encontra (na fila). Obrigado pelo pagamento integral, você está fazendo o barbeiro muito feliz 😁.';
      }
    } else {
      rot = 'Aguardando confirmação do pagamento PIX';
    }

    filaBox.innerHTML = `
      <strong>Seu agendamento</strong><br>
      Barbeiro: ${barbeiro || '-'}<br>
      Horário: ${horario || '-'}<br>
      Status: ${rot}<br>
      <small>Calma aí 😎 Você já tem um corte agendado. Assim que o barbeiro finalizar, você pode marcar outro.</small>
    `;
    filaBox.style.display = 'block';
  }
  function hideMinhaFila() { if (filaBox) filaBox.style.display = 'none'; }

  // Mensagem de fechado global
  let statusGlobalMsg = document.getElementById('statusGlobalMsg');
  if (!statusGlobalMsg && formAg?.parentNode) {
    statusGlobalMsg = document.createElement('div');
    statusGlobalMsg.id = 'statusGlobalMsg';
    statusGlobalMsg.style.margin = '12px 0';
    statusGlobalMsg.style.padding = '10px';
    statusGlobalMsg.style.border = '1px solid #fca5a5';
    statusGlobalMsg.style.background = '#fff1f2';
    statusGlobalMsg.style.color = '#7f1d1d';
    statusGlobalMsg.style.borderRadius = '8px';
    statusGlobalMsg.style.display = 'none';
    formAg.parentNode.insertBefore(statusGlobalMsg, formAg);
  }

  let blockedByQueue = false;
  let blockedByGlobal = false;
  function applyDisableState() {
    setFormDisabled(blockedByQueue || blockedByGlobal);
  }

  // ===== Helpers de data (YYYY-MM-DD no fuso local) =====
  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ===== Conversores de horário =====
  const toMinutes = (hhmm) => {
    const [h, m] = (hhmm || '00:00').split(':').map(Number);
    return (h * 60) + m;
  };
  const toHHMM = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  };

  // Retorna os minutos atuais do dia (ex: 13:25 => 805)
  const nowMinutes = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };

  // ===== Grade de horários por barbeiro (lida com settings/schedule_*) =====
  const selectHorario = document.getElementById('horario');

  async function getScheduleForBarber(barberId) {
    if (!barberId) return null;
    const id = normalizeBarberId(barberId);
    let scheduleDocId = id === 'Yuri' ? 'schedule_Yuri' : (id === 'Pablo' ? 'schedule_Pablo' : null);
    if (!scheduleDocId) return null;

    const db = getFirestore();

    // usa doc canônico
    let snap = await getDoc(doc(db, 'settings', scheduleDocId));
    if (snap.exists()) return snap.data();

    // fallback padrão caso ainda não tenha sido configurado no admin
    return { open: true, slotStart: '09:30', slotEnd: '19:00', slotStep: 35 };
  }

  function generateSlots(start, end, step) {
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

  async function disableTakenSlots(barberId, dataDia) {
    if (!selectHorario || !barberId) return;
    const db = getFirestore();

    // Tenta com operador 'in'. Se seu Firestore não suportar, rodar duas queries separadas.
    try {
      const baseQ = query(
        collection(db, 'agendamentos'),
        where('barbeiro', '==', normalizeBarberId(barberId)),
        where('dataDia', '==', dataDia),
        where('status', 'in', ['aguardando_pagamento', 'pendente'])
      );
      const snap = await getDocs(baseQ);
      const ocupados = new Set(snap.docs.map(d => (d.data().horario)));
      Array.from(selectHorario.options).forEach(opt => {
        if (!opt.value) return;
        if (ocupados.has(opt.value)) {
          opt.disabled = true;
          opt.textContent = `${opt.value} (ocupado)`;
        }
      });
    } catch (_) {
      // Fallback com duas consultas (sem 'in')
      const estados = ['aguardando_pagamento', 'pendente'];
      const ocupados = new Set();
      for (const st of estados) {
        const qst = query(
          collection(db, 'agendamentos'),
          where('barbeiro', '==', normalizeBarberId(barberId)),
          where('dataDia', '==', dataDia),
          where('status', '==', st)
        );
        const snap2 = await getDocs(qst);
        snap2.forEach(docSnap => ocupados.add(docSnap.data().horario));
      }
      Array.from(selectHorario.options).forEach(opt => {
        if (!opt.value) return;
        if (ocupados.has(opt.value)) {
          opt.disabled = true;
          opt.textContent = `${opt.value} (ocupado)`;
        }
      });
    }
  }

  async function populateHorarioForBarber(barberId) {
    if (!selectHorario) return;

    // limpa select e coloca placeholder
    selectHorario.innerHTML = '<option value="">Escolha o horário</option>';

    const sched = await getScheduleForBarber(barberId);
    if (!sched || !sched.open) return; // se fechado, não popula mais nada

    const step = Number(sched.slotStep || 35);
    const slots = generateSlots(sched.slotStart, sched.slotEnd, step);

    // Filtra horários que já passaram no dia atual
    const nowM = nowMinutes();
    const futuros = slots.filter(t => toMinutes(t) >= nowM);

    if (futuros.length === 0) {
      // Sem horários restantes hoje
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Sem horários disponíveis hoje';
      opt.disabled = true;
      selectHorario.appendChild(opt);
    } else {
      for (const time of futuros) {
        const opt = document.createElement('option');
        opt.value = time;
        opt.textContent = time;
        selectHorario.appendChild(opt);
      }

      // Bloqueia horários já ocupados hoje para este barbeiro
      await disableTakenSlots(barberId, todayISO());
    }
    // // Versão antiga (removida):
    // for (const time of slots) {
    //   const opt = document.createElement('option');
    //   opt.value = time;
    //   opt.textContent = time;
    //   selectHorario.appendChild(opt);
    // }
    // await disableTakenSlots(barberId, todayISO());
  }

  // ===== Aplica chave PIX e habilita pagamento somente após escolher barbeiro =====
  function applyBarberPaymentUI(barbeiroRaw){
    const id = normalizeBarberId(barbeiroRaw);
    const chave = PIX_BY_BARBER[id] || '';
    if (pixKeyEl) pixKeyEl.textContent = chave;
    if (pagamentoBox) pagamentoBox.disabled = !id; // só habilita com barbeiro

    // Se pagamento habilitado, garante exibição do bloco de PIX
    if (pixBox) {
      pixBox.style.display = !pagamentoBox.disabled ? 'block' : 'none';
    }
  }

  // ===== Calcula valor (metade/integral) baseado no serviço escolhido =====
  function calcularValor(){
    const servKey = selectServico?.value || '';
    const base = SERVICE_PRICES[servKey];
    const opt = document.querySelector('input[name="payAmount"]:checked')?.value || 'half';

    if (typeof base !== 'number') {
      // sem serviço escolhido ainda
      if (valorSpan) valorSpan.textContent = '--';
      if (pagamentoBox) {
        pagamentoBox.dataset.totalPrice = '';
        pagamentoBox.dataset.amount = '';
        pagamentoBox.dataset.amountOption = opt;
      }
      return;
    }

    const amount = opt === 'full' ? base : (base / 2);
    if (valorSpan) valorSpan.textContent = amount.toFixed(2).replace('.', ',');

    // guarda para o submit ler
    if (pagamentoBox) {
      pagamentoBox.dataset.totalPrice = String(base);
      pagamentoBox.dataset.amount = String(amount);
      pagamentoBox.dataset.amountOption = opt;
    }
  }

  // ===== Listeners =====
  radios.forEach(r => r.addEventListener('change', calcularValor));
  if (selectServico) selectServico.addEventListener('change', calcularValor);

  if (selectBarbeiro) {
    // inicial
    applyBarberPaymentUI(selectBarbeiro.value);
    populateHorarioForBarber(selectBarbeiro.value);

    // mudanças
    selectBarbeiro.addEventListener('change', async () => {
      applyBarberPaymentUI(selectBarbeiro.value);
      await populateHorarioForBarber(selectBarbeiro.value);
    });
  } else {
    if (pagamentoBox) pagamentoBox.disabled = true;
    if (pixBox) pixBox.style.display = 'none';
  }

  // ===== Fechado/aberto GLOBAL (settings/app.bookingsOpen) =====
  function applyGlobalOpen(bookingsOpen) {
    blockedByGlobal = !bookingsOpen;

    // Página pode não ter o aviso nem o form (ex.: index.html)
    if (!statusGlobalMsg) {
      applyDisableState();
      return;
    }

    if (!bookingsOpen) {
      statusGlobalMsg.textContent = 'Agendamentos fechados no momento. Aguarde o barbeiro abrir.';
      statusGlobalMsg.style.display = 'block';
    } else {
      statusGlobalMsg.style.display = 'none';
    }
    applyDisableState();
  }
  onSnapshot(doc(getFirestore(), 'settings', 'app'), (snap) => {
    const open = snap.exists() ? !!snap.data().bookingsOpen : true;
    applyGlobalOpen(open);
  }, (_e)=> applyGlobalOpen(true));

  // ===== Minha Fila do cliente (bloqueia novo agendamento se houver ativo) =====
  let unsubscribeMinhaFila = null;
  function watchMinhaFilaDoCliente() {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user || !formAg) return;
    if (typeof unsubscribeMinhaFila === 'function') {
      try { unsubscribeMinhaFila(); } catch(_) {}
      unsubscribeMinhaFila = null;
    }
    const db = getFirestore();
    const base = collection(db, 'agendamentos');

    const qA = query(base, where('userId','==', user.uid), where('status','==','aguardando_pagamento'));
    const qP = query(base, where('userId','==', user.uid), where('status','==','pendente'));

    let ultimoDoc = null;
    const applyQueue = (hasActive) => {
      blockedByQueue = hasActive;
      if (hasActive && ultimoDoc) showMinhaFila(ultimoDoc); else hideMinhaFila();
      applyDisableState();
    };

    const unA = onSnapshot(qA, (snap) => {
      const hasA = snap.size > 0;
      if (hasA) ultimoDoc = snap.docs[0].data();
      applyQueue(hasA || blockedByQueue);
    });
    const unP = onSnapshot(qP, (snap) => {
      const hasP = snap.size > 0;
      if (hasP) ultimoDoc = snap.docs[0].data();
      applyQueue(hasP || blockedByQueue);
    });

    unsubscribeMinhaFila = () => { try { unA(); unP(); } catch(_) {} };
  }

  onAuthStateChanged(getAuth(), (user) => {
    if (user && formAg) {
      watchMinhaFilaDoCliente();
    } else {
      blockedByQueue = false;
      hideMinhaFila();
      applyDisableState();
      if (typeof unsubscribeMinhaFila === 'function') {
        try { unsubscribeMinhaFila(); } catch(_) {}
        unsubscribeMinhaFila = null;
      }
    }
  });

  // ===== Submit: salvar agendamento com pagamento antecipado (aguardando confirmação) =====
  const form = document.getElementById('formAgendamento');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      // Coleta de campos
      const nome = document.getElementById('nome')?.value?.trim() || '';
      const celular = document.getElementById('agendamentoCelular')?.value?.trim() || '';
      const barbeiroSel = document.getElementById('barbeiro')?.value || '';
      const horarioSel = document.getElementById('horario')?.value || '';
      const servicoSel = document.getElementById('servico')?.value || '';
      const mensagem = document.getElementById('mensagem')?.value?.trim() || '';
      const amountOption = pagamentoBox?.dataset?.amountOption || 'half';
      const totalPrice = Number(pagamentoBox?.dataset?.totalPrice || 0);
      const amount = Number(pagamentoBox?.dataset?.amount || 0);
      const pixKey = (pixKeyEl?.textContent || '').trim();
      const pixNote = document.getElementById('pixNote')?.value?.trim() || '';

      // Validações básicas
      if (!nome || !celular || !barbeiroSel || !horarioSel || !servicoSel) {
        alert('Preencha nome, celular, barbeiro, horário e serviço.');
        return;
      }
      if (!totalPrice || !amount) {
        alert('Selecione o serviço e a opção de pagamento (metade/integral) para calcular o valor.');
        return;
      }
      if (pagamentoBox?.disabled) {
        alert('Selecione um barbeiro para habilitar o pagamento.');
        return;
      }

      try {
        await addDoc(collection(getFirestore(), 'agendamentos'), {
          nome,
          celular,
          barbeiro: normalizeBarberId(barbeiroSel),
          horario: horarioSel,
          dataDia: todayISO(),
          servico: servicoSel,
          mensagem,
          criadoEm: serverTimestamp(),
          // Fila/pagamento
          status: 'aguardando_pagamento',     // só entra na fila após confirmar PIX no admin
          paymentMethod: 'pix',
          paymentStatus: 'pending',
          amountOption,                       // 'half' | 'full'
          totalPrice,                         // preço do serviço
          amount,                             // valor a pagar agora
          pixKey,
          pixNote,
          userId: getAuth().currentUser?.uid || null,
          userEmail: getAuth().currentUser?.email || null
        });

        // Feedback rápido
        alert('Agendamento enviado! Aguarde a confirmação do pagamento pelo barbeiro.');
        form.reset();
        // Reset da UI dependente
        if (valorSpan) valorSpan.textContent = '--';
        if (pixKeyEl) pixKeyEl.textContent = '';
        if (pagamentoBox) {
          pagamentoBox.disabled = true;
          delete pagamentoBox.dataset.totalPrice;
          delete pagamentoBox.dataset.amount;
          delete pagamentoBox.dataset.amountOption;
        }
      } catch (err) {
        console.error('Erro ao salvar agendamento:', err);
        alert('Não foi possível salvar seu agendamento agora. Tente novamente.');
      }
    });
  }

  // inicial: calcula caso já tenha algo marcado
  calcularValor();
});