import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCnsA89psIo30sQdBM9wFFzydnfOLcOKIc",
  authDomain: "barbex-app.firebaseapp.com",
  projectId: "barbex-app",
  storageBucket: "barbex-app.appspot.com",
  messagingSenderId: "91864465722",
  appId: "1:91864465722:web:7a3365582f3ca63e19d003"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Mostrar seções (login, cadastro, etc.)
function mostrarSecao(id) {
  document.querySelectorAll("section").forEach(sec => sec.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}
window.mostrarSecao = mostrarSecao;

// Login com Firebase Auth
function fazerLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const senha = document.getElementById("loginSenha").value.trim();

  if (!email || !senha) {
    alert("Preencha todos os campos.");
    return;
  }

  signInWithEmailAndPassword(auth, email, senha)
    .then(userCredential => {
      if (
        (email === "admin1@barberx.com" || email === "admin2@barberx.com") &&
        senha === "admin123"
      ) {
        window.location.href = "admin.html";
      } else {
        window.location.href = "agendamento.html";
      }
    })
    .catch(error => {
      alert("Email ou senha inválidos.");
      console.error(error);
    });
}
window.fazerLogin = fazerLogin;

// Cadastro com Firebase Auth
function cadastrarUsuario() {
  const nome = document.getElementById("cadastroNome").value.trim();
  const email = document.getElementById("cadastroEmail").value.trim();
  const celular = document.getElementById("cadastroCelular").value.trim();
  const senha = document.getElementById("cadastroSenha").value.trim();

  if (!nome || !email || !celular || !senha) {
    alert("Preencha todos os campos.");
    return;
  }

  createUserWithEmailAndPassword(auth, email, senha)
    .then(() => {
      alert("Cadastro realizado com sucesso!");
      mostrarSecao("login");
    })
    .catch(error => {
      console.error("Erro ao cadastrar:", error);
      alert("Erro ao cadastrar: " + error.message);
    });
}
window.cadastrarUsuario = cadastrarUsuario;

// Aplicar máscara celular
function aplicarMascaraCelular(input) {
  input.addEventListener("input", function () {
    let valor = input.value.replace(/\D/g, "");
    if (valor.length > 11) valor = valor.slice(0, 11);

    valor = valor.replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*/, function (_, ddd, prefixo, sufixo) {
      let resultado = "";
      if (ddd) resultado += `(${ddd}`;
      if (ddd.length === 2) resultado += `) `;
      if (prefixo) resultado += prefixo;
      if (prefixo.length === 5 && sufixo) resultado += `-${sufixo}`;
      return resultado;
    });

    input.value = valor;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const campoCadastroCelular = document.getElementById("cadastroCelular");
  if (campoCadastroCelular) aplicarMascaraCelular(campoCadastroCelular);
});