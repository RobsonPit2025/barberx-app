import { getFirestore, collection, doc, getDoc, setDoc, onSnapshot, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ===== Pagamento antecipado (metade/integral) — CLIENTE =====
document.addEventListener('DOMContentLoaded', function(){
  // ===== Configuração de serviços (provisório até a tabela oficial) =====
  // Quando a tabela chegar, podemos mover isso para o Firestore.
  const SERVICE_PRICES = {
    barba: 15.00,
    cabelo_barba: 25.00
  };

  // ===== PIX por barbeiro =====
  const PIX_BY_BARBER = {
    Yure: "71993112261",
    Yuri: "71993112261", // alias comum
    Pablo: "06126840593"
  };
  function normalizeBarberId(v){
    const s = (v || '').toString().toLowerCase();
    if (s.includes('yure') || s.includes('yuri')) return 'Yure';
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
    // mudanças
    selectBarbeiro.addEventListener('change', () => applyBarberPaymentUI(selectBarbeiro.value));
  } else {
    if (pagamentoBox) pagamentoBox.disabled = true;
    if (pixBox) pixBox.style.display = 'none';
  }

  // inicial: calcula caso já tenha algo marcado
  calcularValor();
});