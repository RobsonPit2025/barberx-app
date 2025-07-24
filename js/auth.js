// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

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

window.cadastrar = function () {
  const email = document.getElementById("cadastroUsuario").value;
const senha = document.getElementById("cadastroSenha").value;

  createUserWithEmailAndPassword(auth, email, senha)
    .then(() => {
      alert("Usuário cadastrado com sucesso!");
    })
    .catch((error) => {
      alert("Erro ao cadastrar: " + error.message);
    });
}

window.logar = function () {
  const email = document.getElementById('loginUsuario').value;
  const senha = document.getElementById('loginSenha').value;

  signInWithEmailAndPassword(auth, email, senha)
    .then(() => {
      // Aqui você pode redirecionar para páginas diferentes com base no e-mail, por exemplo
      if (email === "admin@barberx.com") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "agendamento.html";
      }
    })
    .catch((error) => {
      alert("Erro ao fazer login: " + error.message);
    });
}
