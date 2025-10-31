import { getFirestore, collection, doc, getDoc, setDoc, onSnapshot, updateDoc, addDoc, serverTimestamp, getDocs, query, where, runTransaction } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// ===== Firebase Cloud Messaging (FCM) =====
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging.js";

import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyCnsA89psIo30sQdBM9wFFzydnfOLcOKIc",
  authDomain: "barbex-app.firebaseapp.com",
  projectId: "barbex-app",
  storageBucket: "barbex-app.appspot.com",
  messagingSenderId: "91864465722",
  appId: "1:91864465722:web:7a3365582f3ca63e19d003"
};

// Inicializa o Firebase App logo após a definição do firebaseConfig
initializeApp(firebaseConfig);

// FCM token cache para uso após submit
let fcmClientToken = null;
let fcmMessagingInstance = null;
let fcmServiceWorkerRegistration = null;
let fcmInitDone = false;

/**
 * Inicializa o FCM, registra o Service Worker e configura listeners de mensagem.
 * Chame apenas uma vez por sessão.
 */
async function initFirebaseMessaging() {
  if (fcmInitDone) return;
  fcmInitDone = true;
  try {
    // Inicializa o Firebase App se necessário e obtém o messaging
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    fcmMessagingInstance = messaging;

    // Registra o Service Worker do FCM (precisa estar na raiz pública)
    fcmServiceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('[FCM] Service Worker registrado:', fcmServiceWorkerRegistration);

    // Solicita permissão de notificação ao usuário
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Permissão de notificação negada.');
      return;
    }

    // Listener para mensagens recebidas enquanto o app está aberto
    onMessage(messaging, (payload) => {
      console.log('[FCM] Mensagem recebida em foreground:', payload);
      const notification = payload.notification;
      if (notification) {
        // Exibição visual simples (alerta) além da Notification API
        alert((notification.title || 'Notificação') + '\n\n' + (notification.body || ''));
        const notif = new Notification(notification.title || 'Notificação', {
          body: notification.body || '',
          icon: notification.icon || '/icons/icon-192.png'
        });
        // Se a aba atual não for a de agendamento ou o usuário não estiver visível na página, garante notificação
        if (document.hidden || !window.location.pathname.includes('agendamento')) {
          try {
            new Notification(notification.title || 'Notificação', {
              body: notification.body || '',
              icon: notification.icon || '/icons/icon-192.png'
            });
            console.log('[FCM] Notificação mostrada mesmo fora da tela de agendamento.');
          } catch (e) {
            console.warn('[FCM] Falha ao mostrar notificação fora da tela ativa:', e);
          }
        }
      }
      console.log('[FCM] Notificação processada completamente.');
    });

    // Após permissão, tenta obter e salvar o token imediatamente
    await refreshAndSaveFcmToken();
  } catch (err) {
    console.error('[FCM] Erro ao inicializar:', err);
  }
}

/**
 * Obtém o token FCM, salva no Firestore se autenticado e atualiza cache.
 * Chame após login ou quando quiser garantir o token atualizado.
 */
async function refreshAndSaveFcmToken() {
  try {
    if (!fcmMessagingInstance || !fcmServiceWorkerRegistration) {
      console.warn('[FCM] Messaging ou Service Worker não inicializado.');
      return;
    }
    // Substitua pela sua chave pública VAPID do Firebase Cloud Messaging
    const vapidKey = 'BB_cb-xc9ySfW6jxl6xbVbwjPN1rQTJ8KIbNX8IDLz_bJPAhHoBuaqAjYqvhPIlZpL4f5oWkukM3tAEy3ekicck';
    const token = await getToken(fcmMessagingInstance, { vapidKey, serviceWorkerRegistration: fcmServiceWorkerRegistration });
    if (token) {
      if (token !== fcmClientToken) {
        console.log('[FCM] Novo token FCM obtido:', token);
      } else {
        console.log('[FCM] Token FCM já atualizado.');
      }
      fcmClientToken = token;
      // Salva o token no Firestore vinculado ao usuário logado, se autenticado
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const db = getFirestore();
        await setDoc(doc(db, 'user_tokens', user.uid), {
          token,
          updatedAt: serverTimestamp()
        });
        console.log('[FCM] Token FCM salvo no Firestore com sucesso!');
      } else {
        // Usuário ainda não autenticado; salvar após login.
        console.warn('[FCM] Usuário não autenticado, token não salvo agora.');
      }
    } else {
      console.warn('[FCM] Não foi possível obter token FCM.');
    }
  } catch (err) {
    console.error('[FCM] Erro ao obter/salvar token FCM:', err);
  }
}

// Inicia o FCM quando o DOM estiver pronto e browser suporta
if ('serviceWorker' in navigator && 'Notification' in window) {
  document.addEventListener('DOMContentLoaded', initFirebaseMessaging);
}

// Listener global para testar se o navegador pode receber notificações e logar visibilidade
document.addEventListener('visibilitychange', () => {
  console.log('[FCM] Visibilidade da página alterada:', document.hidden ? 'oculta' : 'visível');
});

// ===== VIP: O recurso de VIP é implementado apenas no lado do cliente (browser) para facilitar upgrades e testes rápidos. =====

// ===== Pagamento antecipado (metade/integral) — CLIENTE =====
document.addEventListener('DOMContentLoaded', function(){
  // ===== VIP cache/configuração =====
  let vipConfig = { enabled: false, emails: new Set(), uids: new Set(), maxActive: 2 };
  function isVipUser(user) {
    if (!vipConfig.enabled) return false; // feature flag: VIP desligado => ignora
    if (!user) return false;
    const email = (user.email || '').toLowerCase();
    return (email && vipConfig.emails.has(email)) || (user.uid && vipConfig.uids.has(user.uid));
  }
  function vipLimitFor(user) {
    if (!vipConfig.enabled) return 1; // VIP desligado => comportamento padrão, 1 ativo
    return isVipUser(user) ? (vipConfig.maxActive || 2) : 1;
  }
  // Limite por DIA (VIP = 10, comum = 1)
  function vipDailyLimitFor(user) {
    if (!vipConfig.enabled) return 1;
    return isVipUser(user) ? 10 : 1;
  }
  // Carrega configuração VIP do Firestore
  onSnapshot(doc(getFirestore(),'settings','vip'), (snap) => {
    // Valores seguros por padrão (feature flag OFF)
    vipConfig.enabled = false;
    vipConfig.emails = new Set();
    vipConfig.uids = new Set();
    vipConfig.maxActive = 2;

    if (snap.exists()) {
      const data = snap.data() || {};
      vipConfig.enabled = Boolean(data.enabled); // só liga VIP se enabled === true
      vipConfig.emails = new Set(Array.isArray(data.emails) ? data.emails.map(e => (e||'').toLowerCase()) : []);
      vipConfig.uids = new Set(Array.isArray(data.uids) ? data.uids : []);
      vipConfig.maxActive = (typeof data.maxActive === 'number' && data.maxActive >= 1) ? data.maxActive : 2;
    }
    // Reavalia bloqueio global considerando estado VIP atualizado
    applyGlobalOpen(bookingsOpenCurrent);
  });
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
    Yure: "71981218562",
    Pablo: "71981879989"
  };
  function normalizeBarberId(v){
    const s = (v || '').toString().toLowerCase();
    if (s.includes('yure') || s.includes('yure')) return 'Yure';
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

  // Botão de copiar PIX (tenta achar por id, data-attr ou classe genérica)
  const copyPixBtn = document.getElementById('copyPixBtn') || document.querySelector('[data-copy="pix"], .copy-pix');

  // Copia texto para a área de transferência com fallback
  async function copyTextToClipboard(text) {
    if (!text) throw new Error('Texto vazio');
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch (_) { /* fallback abaixo */ }

    // Fallback: usa textarea temporário
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(ta);
    }
  }

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

    const user = getAuth().currentUser;
    const limit = vipDailyLimitFor(user);
    const vipHint = (vipConfig.enabled && limit > 1)
      ? `<div style="margin-top:6px;color:#374151;font-size:12px">Conta VIP: você pode ter até ${limit} agendamentos ativos <strong>por dia</strong>.</div>`
      : '';

    filaBox.innerHTML = `
      <strong>Seu agendamento</strong><br>
      Barbeiro: ${barbeiro || '-'}<br>
      Horário: ${horario || '-'}<br>
      Status: ${rot}<br>
      <small>Calma aí 😎 Você já tem um corte agendado. Assim que o barbeiro finalizar, você pode marcar outro.</small>
      ${vipHint}
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
  let bookingsOpenCurrent = true; // último valor conhecido de settings/app.bookingsOpen
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
    const db = getFirestore();
    const scheduleDocId = `schedule_${id.toLowerCase()}`;
    const snap = await getDoc(doc(db, 'settings', scheduleDocId));
    if (snap.exists()) return snap.data();
    // fallback padrão caso ainda não tenha sido configurado no admin
    return { open: true, slotStart: '09:30', slotEnd: '19:00', slotStep: 35 };
  }

  function generateSlots(start, end, step) {
  const out = [];
  const inc = Number(step || 35);
  if (!inc || inc <= 0) return out;

  const s = toMinutes(start);
  let e = toMinutes(end);
  const MIN_IN_DAY = 24 * 60; // 1440

  // Se end for 00:00, trata como 24:00 (fim do dia = 1440 minutos)
  if (e === 0 && start !== '00:00') {
    e = MIN_IN_DAY;
  }

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

    // Lê os locks do barbeiro e do dia selecionado
    const qLocks = query(
      collection(db, 'slot_locks'),
      where('barbeiro', '==', normalizeBarberId(barberId)),
      where('dataDia', '==', dataDia)
    );
    const snap = await getDocs(qLocks);

    const ocupados = new Set(snap.docs.map(d => (d.data().horario)));
    Array.from(selectHorario.options).forEach(opt => {
      if (!opt.value) return;
      if (ocupados.has(opt.value)) {
        opt.disabled = true;
        // sempre reescreve o rótulo para evitar duplicações tipo "(disponível) (ocupado)"
        opt.textContent = `${opt.value} (ocupado)`;
      }
    });
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

    // ===== Janela de ALMOÇO: computa slots que caem dentro do almoço =====
    const almoco = new Set();
    const lunchStart = (sched.lunchStart || '').trim();
    const lunchEnd   = (sched.lunchEnd   || '').trim();
    if (lunchStart && lunchEnd) {
      const ls = toMinutes(lunchStart);
      const le = toMinutes(lunchEnd);
      if (Number.isFinite(ls) && Number.isFinite(le) && step > 0) {
        if (ls <= le) {
          // inclui o horário final do almoço
          for (let t = ls; t <= le; t += step) almoco.add(toHHMM(t));
        } else {
          // almoço atravessando a meia-noite: inclui o horário final
          for (let t = ls; t < 1440; t += step) almoco.add(toHHMM(t));
          for (let t = 0; t <= le; t += step) almoco.add(toHHMM(t));
        }
      }
    }

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
        const isLunch = almoco.has(time);
        // NÃO adiciona "(disponível)" aqui para evitar duplicação posterior
        opt.textContent = isLunch ? `${time} (almoço)` : time;
        if (isLunch) opt.disabled = true; // aparece, mas não selecionável
        selectHorario.appendChild(opt);
      }

      // Bloqueia horários já ocupados hoje para este barbeiro
      try {
        await disableTakenSlots(barberId, todayISO());
      } catch (err) {
        console.warn('Não foi possível ler locks (slot_locks). A grade aparece sem "(ocupado)".', err);
      }
      // Marcar os horários livres explicitamente como "(disponível)"
      Array.from(selectHorario.options).forEach(opt => {
        if (!opt.value) return; // ignora placeholder
        if (!opt.disabled) {
          // reescreve o rótulo garantindo formato consistente
          opt.textContent = `${opt.value} (disponível)`;
        }
      });
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

    // habilita/desabilita botão de copiar conforme exista chave PIX
    if (copyPixBtn) {
      copyPixBtn.disabled = !chave;
      copyPixBtn.setAttribute('aria-disabled', String(!chave));
      copyPixBtn.title = chave ? 'Copiar chave PIX' : 'Selecione um barbeiro para ver a chave PIX';
    }
  }

  // ===== Copiar chave PIX =====
  if (copyPixBtn) {
    copyPixBtn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      const txt = (pixKeyEl?.textContent || '').trim();
      if (!txt) {
        alert('Nenhuma chave PIX disponível. Selecione um barbeiro.');
        return;
      }
      try {
        await copyTextToClipboard(txt);
        // feedback rápido
        const original = copyPixBtn.textContent;
        copyPixBtn.textContent = 'Copiado!';
        copyPixBtn.disabled = true;
        setTimeout(() => {
          copyPixBtn.textContent = original || 'Copiar';
          copyPixBtn.disabled = false;
        }, 1200);
      } catch (err) {
        console.error('Falha ao copiar PIX:', err);
        alert('Não foi possível copiar automaticamente. Selecione e copie manualmente.');
      }
    });
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
    if (copyPixBtn) copyPixBtn.disabled = true;
  }

  function applyGlobalOpen(bookingsOpen) {
  // guarda o último valor conhecido para reavaliar quando VIP/auth mudar
  bookingsOpenCurrent = !!bookingsOpen;

  const user = getAuth().currentUser;
  const vipBypass = vipConfig.enabled && isVipUser(user); // VIP pode agendar mesmo com global fechado

  blockedByGlobal = !bookingsOpen && !vipBypass;

  // Página pode não ter o aviso nem o form (ex.: index.html)
  if (!statusGlobalMsg) {
    applyDisableState();
    return;
  }

  if (!bookingsOpen && !vipBypass) {
    statusGlobalMsg.textContent = 'Agendamentos fechados no momento. Aguarde o barbeiro abrir.';
    statusGlobalMsg.style.display = 'block';
  } else {
    // VIP bypass ou aberto normalmente => oculta aviso
    statusGlobalMsg.style.display = 'none';
  }

  applyDisableState();
}
  onSnapshot(doc(getFirestore(), 'settings', 'app'), (snap) => {
    const open = snap.exists() ? !!snap.data().bookingsOpen : true;
    applyGlobalOpen(open);
  }, (_e)=> applyGlobalOpen(true));

  // ===== Minha Fila do cliente (bloqueia novo agendamento se houver ativo, respeitando limite VIP) =====
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
    const dataHoje = todayISO();

    const qA = query(base, where('userId','==', user.uid), where('dataDia','==', dataHoje), where('status','==','aguardando_pagamento'));
    const qP = query(base, where('userId','==', user.uid), where('dataDia','==', dataHoje), where('status','==','pendente'));

    let sizeA = 0;
    let sizeP = 0;
    let ultimoDoc = null;
    function recalc() {
      const user = getAuth().currentUser;
      const limit = vipDailyLimitFor(user);
      const total = sizeA + sizeP;
      blockedByQueue = total >= limit;
      if ((sizeA || sizeP) && ultimoDoc) showMinhaFila(ultimoDoc); else hideMinhaFila();
      applyDisableState();
    }

    const unA = onSnapshot(qA, (snap) => {
      sizeA = snap.size;
      if (snap.size > 0) ultimoDoc = snap.docs[0].data();
      recalc();
    });
    const unP = onSnapshot(qP, (snap) => {
      sizeP = snap.size;
      if (snap.size > 0) ultimoDoc = snap.docs[0].data();
      recalc();
    });

    unsubscribeMinhaFila = () => { try { unA(); unP(); } catch(_) {} };
  }

  onAuthStateChanged(getAuth(), async (user) => {
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
    // Reavalia a fila ao mudar usuário para garantir limites VIP corretos
    if (user && formAg) {
      watchMinhaFilaDoCliente();
    }
    // Recarrega a grade após login para garantir que os horários "(ocupado)"
    // apareçam quando as regras exigem autenticação para ler `slot_locks`.
    if (user && selectBarbeiro && selectBarbeiro.value) {
      populateHorarioForBarber(selectBarbeiro.value);
    }
    // Revalida e salva token FCM sempre que usuário logar
    if (user && fcmMessagingInstance && fcmServiceWorkerRegistration) {
      await refreshAndSaveFcmToken();
    }
    // Reavalia bloqueio global considerando VIP/auth atual
    applyGlobalOpen(bookingsOpenCurrent);
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

      // Verificação de limite diário (VIP por dia)
      try {
        const db = getFirestore();
        const barberNorm = normalizeBarberId(barbeiroSel);
        const dataISO = todayISO();
        const auth = getAuth();
        const user = auth.currentUser;
        const perDayLimit = vipDailyLimitFor(user);
        const qCount = query(
          collection(db, 'agendamentos'),
          where('userId','==', user?.uid || ''),
          where('dataDia','==', dataISO),
          where('status','in', ['aguardando_pagamento','pendente'])
        );
        const snapCount = await getDocs(qCount);
        if (snapCount.size >= perDayLimit) {
          alert(`Você atingiu o limite de ${perDayLimit} agendamentos ativos para hoje.`);
          return;
        }

        const slotKey = `${barberNorm}_${dataISO}_${horarioSel}`.replace(/\s+/g,'');

        await runTransaction(db, async (tx) => {
          const lockRef = doc(db, 'slot_locks', slotKey);
          const lockSnap = await tx.get(lockRef);
          if (lockSnap.exists()) {
            throw new Error('Este horário acabou de ser ocupado. Escolha outro.');
          }

          // cria o lock do horário
          tx.set(lockRef, {
            barbeiro: barberNorm,
            dataDia: dataISO,
            horario: horarioSel,
            createdAt: serverTimestamp(),
            userId: getAuth().currentUser?.uid || null,
            userEmail: getAuth().currentUser?.email || null
          });

          // cria o agendamento amarrado ao lock
          const agRef = doc(collection(db, 'agendamentos'));
          tx.set(agRef, {
            nome,
            celular,
            barbeiro: barberNorm,
            horario: horarioSel,
            dataDia: dataISO,
            servico: servicoSel,
            mensagem,
            criadoEm: serverTimestamp(),
            status: 'aguardando_pagamento',
            paymentMethod: 'pix',
            paymentStatus: 'pending',
            amountOption,
            totalPrice,
            amount,
            pixKey,
            pixNote,
            userId: getAuth().currentUser?.uid || null,
            userEmail: getAuth().currentUser?.email || null,
            lockId: slotKey
          });
        });

        // Após agendamento, tenta revalidar/salvar o token FCM no Firestore se disponível
        try {
          const auth = getAuth();
          const user = auth.currentUser;
          if (user && fcmMessagingInstance && fcmServiceWorkerRegistration) {
            await refreshAndSaveFcmToken();
          }
        } catch (errToken) {
          console.warn('[FCM] Não foi possível salvar o token FCM após agendamento:', errToken);
        }

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