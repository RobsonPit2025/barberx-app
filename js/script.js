// Função para alternar entre seções
function showSection(id) {
  document.querySelectorAll('.secao').forEach(sec => sec.classList.add('oculto'));
  const sec = document.getElementById(id);
  if (sec) sec.classList.remove('oculto');
}

// Carrega os usuários do localStorage (ou inicia com admin padrão)
let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [
  { usuario: "admin", senha: "123", tipo: "admin" }
];

// Salva no localStorage sempre que o array for alterado
function salvarUsuarios() {
  localStorage.setItem('usuarios', JSON.stringify(usuarios));
}

// Função de cadastro
function cadastrar() {
  const nome = document.getElementById('cadastroNome').value.trim();
  const usuario = document.getElementById('cadastroUsuario').value.trim();
  const senha = document.getElementById('cadastroSenha').value.trim();

  if (!nome || !usuario || !senha) {
    alert("Preencha todos os campos.");
    return;
  }

  const existe = usuarios.some(u => u.usuario === usuario);
  if (existe) {
    alert("Usuário já cadastrado.");
    return;
  }

  usuarios.push({ usuario, senha, tipo: "cliente" });
  salvarUsuarios();
  alert("Cadastro realizado com sucesso!");

  document.getElementById('cadastroNome').value = '';
  document.getElementById('cadastroUsuario').value = '';
  document.getElementById('cadastroSenha').value = '';

  showSection('loginCliente');
}

// Função de login
function logar() {
  const usuario = document.getElementById('loginUsuario').value.trim();
  const senha = document.getElementById('loginSenha').value.trim();
  const loginMsg = document.getElementById('loginMsg');

  const user = usuarios.find(u => u.usuario === usuario && u.senha === senha);

  if (user) {
    loginMsg.textContent = `Bem-vindo, ${user.usuario} (${user.tipo})!`;
    showSection('agendamento');
  } else {
    loginMsg.textContent = "Usuário ou senha incorretos.";
  }

  document.getElementById('loginUsuario').value = '';
  document.getElementById('loginSenha').value = '';
}
