function mostrarSecao(id) {
  document.querySelectorAll('section').forEach(sec => sec.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function cadastrarUsuario() {
  const nome = document.getElementById('cadastroNome').value;
  const email = document.getElementById('cadastroEmail').value;
  const celular = document.getElementById('cadastroCelular').value;
  const senha = document.getElementById('cadastroSenha').value;

  if (!nome || !email || !celular || !senha) {
    alert("Preencha todos os campos");
    return;
  }

  alert("Usuário cadastrado com sucesso! (Simulação)");
}

function fazerLogin() {
  const email = document.getElementById('loginEmail').value;
  const senha = document.getElementById('loginSenha').value;

  if (email === 'admin@barberx.com' && senha === '123456') {
    alert("Login como admin. (Em breve redireciona)");
  } else {
    alert("Login como cliente. (Em breve redireciona)");
  }
}
