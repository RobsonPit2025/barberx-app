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
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value.trim();

  if (
    (email === "admin1@barberx.com" || email === "admin2@barberx.com") &&
    senha === "admin123"
  ) {
    window.location.href = "admin.html";
  } else if (email && senha) {
    window.location.href = "agendamento.html";
  } else {
    alert("Preencha todos os campos corretamente.");
  }
}

function aplicarMascaraCelular(input) {
  input.addEventListener("input", function(e) {
    let valor = input.value.replace(/\D/g, "");

    if (valor.length > 11) valor = valor.slice(0, 11);

    if (valor.length > 0) {
      valor = valor.replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*/, function (_, ddd, prefixo, sufixo) {
        let resultado = "";
        if (ddd) resultado += `(${ddd}`;
        if (ddd.length === 2) resultado += `) `;
        if (prefixo) resultado += prefixo;
        if (prefixo.length === 5 && sufixo) resultado += `-${sufixo}`;
        return resultado;
      });
    }

    input.value = valor;
  });
}

const campoCadastroCelular = document.getElementById("cadastroCelular");
if (campoCadastroCelular) aplicarMascaraCelular(campoCadastroCelular);