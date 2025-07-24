
function mostrarSecao(id) {
  document.querySelectorAll('.secao').forEach(sec => sec.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function fazerLogin() {
  const email = document.getElementById('loginEmail').value;
  const senha = document.getElementById('loginSenha').value;
  alert(`Login com ${email} (senha escondida)`);
}

function fazerCadastro() {
  const nome = document.getElementById('cadastroNome').value;
  const email = document.getElementById('cadastroEmail').value;
  const celular = document.getElementById('cadastroCelular').value;
  const senha = document.getElementById('cadastroSenha').value;
  alert(`Cadastro de ${nome} realizado!`);
}
