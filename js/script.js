function showSection(id) {
  document.querySelectorAll('section').forEach(sec => sec.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function cadastrar() {
  const nome = document.getElementById('cadastroNome').value;
  const usuario = document.getElementById('cadastroUsuario').value;
  const senha = document.getElementById('cadastroSenha').value;

  if (!usuario || !senha || !nome) {
    alert("Preencha todos os campos.");
    return;
  }

  // Firebase: Aqui futuramente enviaremos os dados para o banco
  alert("Cadastro enviado (ainda não salvo).");
}

function logar() {
  const usuario = document.getElementById('loginUsuario').value;
  const senha = document.getElementById('loginSenha').value;

  if (!usuario || !senha) {
    alert("Preencha todos os campos.");
    return;
  }

  // Firebase: Aqui futuramente vamos verificar o login no banco
  if (usuario === "admin" && senha === "123") {
    window.location.href = "admin.html";
  } else {
    window.location.href = "agendamento.html";
  }
}
