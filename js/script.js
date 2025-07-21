document.getElementById('form-agendamento').addEventListener('submit', function(e) {
  e.preventDefault();

  const nome = document.getElementById('nome').value;
  const telefone = document.getElementById('telefone').value;
  const barbeiro = document.getElementById('barbeiro').value;
  const data = document.getElementById('data').value;
  const hora = document.getElementById('hora').value;

  const agendamento = {
    nome,
    telefone,
    barbeiro,
    data,
    hora
  };

  let agendamentos = JSON.parse(localStorage.getItem('agendamentos')) || [];
  agendamentos.push(agendamento);
  localStorage.setItem('agendamentos', JSON.stringify(agendamentos));

  document.getElementById('mensagem').textContent = 'Agendamento confirmado!';
  this.reset();
});
