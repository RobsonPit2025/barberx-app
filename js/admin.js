const frases = [
  "Um corte de cabelo pode mudar o seu dia!",
  "O sucesso é a soma de pequenos cortes bem feitos.",
  "Barbearia é arte, talento e paixão.",
  "Comece o dia com estilo.",
  "Mais que cortes, criamos autoestima!"
];

function mostrarSeção(secaoId) {
  document.querySelectorAll(".painel").forEach(secao => {
    secao.classList.add("hidden");
    secao.classList.remove("active");
  });
  const selecionado = document.getElementById(secaoId);
  if (selecionado) {
    selecionado.classList.remove("hidden");
    selecionado.classList.add("active");
  }
}

function mostrarFraseMotivacional() {
  const frase = frases[new Date().getDay() % frases.length];
  const el = document.getElementById("fraseMotivacional");
  if (el) el.textContent = frase;
}

mostrarFraseMotivacional();

// Simulação de fila do dia
const filaYure = ["Robson - 10h", "Neto - 11h"];
const filaPablo = ["Nike - 10:30h", "Carlos - 12h"];

const ulYure = document.querySelector("#yuri ul");
const ulPablo = document.querySelector("#pablo ul");

filaYure.forEach(nome => {
  const li = document.createElement("li");
  li.textContent = nome;
  ulYure.appendChild(li);
});

filaPablo.forEach(nome => {
  const li = document.createElement("li");
  li.textContent = nome;
  ulPablo.appendChild(li);
});

// Navegação entre painéis
function mostrarSeção(secaoId) {
  document.querySelectorAll(".painel").forEach(secao => {
    secao.classList.remove("active");
    secao.classList.add("hidden");
  });

  const secaoSelecionada = document.getElementById(secaoId);
  if (secaoSelecionada) {
    secaoSelecionada.classList.remove("hidden");
    secaoSelecionada.classList.add("active");
  }
}

// Botão de logout
document.getElementById("logout2").addEventListener("click", () => {
  window.location.href = "index.html";
});

// Simulação do relatório mensal
const relatorio = {
  janeiro: { yure: 14, pablo: 9 },
  fevereiro: { yure: 18, pablo: 12 },
  março: { yure: 11, pablo: 10 },
  abril: { yure: 22, pablo: 20 },
  maio: { yure: 17, pablo: 14 },
  junho: { yure: 9, pablo: 15 },
  julho: { yure: 25, pablo: 27 },
  agosto: { yure: 0, pablo: 0 },
  setembro: { yure: 0, pablo: 0 },
  outubro: { yure: 0, pablo: 0 },
  novembro: { yure: 0, pablo: 0 },
  dezembro: { yure: 0, pablo: 0 },
};

const tbody = document.querySelector("#tabelaRelatorio tbody");

for (const mes in relatorio) {
  const linha = document.createElement("tr");
  linha.innerHTML = `
    <td>${mes.charAt(0).toUpperCase() + mes.slice(1)}</td>
    <td>${relatorio[mes].yure} cortes</td>
    <td>${relatorio[mes].pablo} cortes</td>
  `;
  tbody.appendChild(linha);
}

// Simulação de envio de imagem
function enviarImagem() {
  const barbeiro = document.getElementById("barbeiroSelect").value;
  const input = document.getElementById("imagemCorte");
  const mensagem = document.getElementById("mensagemImagem");

  if (!input.files || input.files.length === 0) {
    mensagem.textContent = "Selecione uma imagem primeiro.";
    mensagem.style.color = "red";
    return;
  }

  const nomeArquivo = input.files[0].name;
  mensagem.textContent = `Imagem "${nomeArquivo}" enviada com sucesso para ${barbeiro.toUpperCase()}!`;
  mensagem.style.color = "green";

  // Limpa campo
  input.value = "";
}