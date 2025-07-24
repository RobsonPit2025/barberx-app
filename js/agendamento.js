document.getElementById('formAgendamento').addEventListener('submit', function(e) {
  e.preventDefault();

  const nome = document.getElementById('nome').value;
  const celular = document.getElementById('celular').value;
  const barbeiro = document.getElementById('barbeiro').value;
  const mensagem = document.getElementById('mensagem').value;

  if (!nome || !celular || !barbeiro) {
    alert("Preencha todos os campos obrigatórios.");
    return;
  }

  // Simulação de fila
  const painel = document.getElementById('painelFila');
  const item = document.createElement('div');
  item.innerHTML = `<p><strong>Nome:</strong> ${nome}<br><strong>Barbeiro:</strong> ${barbeiro}<br><strong>Mensagem:</strong> ${mensagem}</p>`;
  painel.appendChild(item);

  alert("Corte marcado! Veja abaixo sua posição na fila.");
});
