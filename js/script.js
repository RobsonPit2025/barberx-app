function showSection(id) {
  document.querySelectorAll('section').forEach(sec => sec.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function cadastrar() {
  const nome = document.getElementById('cadastroNome').value;
  const email = document.getElementById('cadastroUsuario').value;
  const celular = document.getElementById('cadastroCelular').value;
  const senha = document.getElementById('cadastroSenha').value;

  if (!nome || !email || !celular || !senha) {
    alert("Preencha todos os campos!");
    return;
  }

  alert("Cadastro realizado com sucesso! Redirecionando para agendamento...");
  window.location.href = "agendamento.html";
}

function logar() {
  const email = document.getElementById('loginUsuario').value;
  const senha = document.getElementById('loginSenha').value;

  if (!email || !senha) {
    alert("Preencha todos os campos!");
    return;
  }

  // Simulação de login simples
  alert("Login realizado com sucesso!");
  window.location.href = "agendamento.html";
}
