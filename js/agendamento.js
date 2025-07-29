const fila = {
  Yure: [],
  Pablo: []
};

const form = document.getElementById('formAgendamento');
const painel = document.getElementById('painelFila');
const celularInput = document.getElementById('agendamentoCelular');

function aplicarMascaraCelular(input) {
  input.addEventListener("input", function (e) {
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

aplicarMascaraCelular(celularInput);

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  const celular = document.getElementById('agendamentoCelular').value.trim();
  const barbeiro = document.getElementById('barbeiro').value;
  const mensagem = document.getElementById('mensagem').value.trim();

  if (!nome || !celular || !barbeiro) {
    alert("Preencha todos os campos obrigatórios.");
    return;
  }

  // Verifica se o cliente já está na fila do barbeiro
  const jaNaFila = fila[barbeiro].some(cliente => cliente.celular === celular);
  if (jaNaFila) {
    alert("Você já está na fila. Aguarde até o corte ser concluído.");
    return;
  }

  const posicao = fila[barbeiro].length + 1;
  fila[barbeiro].push({ nome, celular, mensagem });

  painel.innerHTML = `
    <h3>Você é o número ${posicao} na fila do barbeiro ${barbeiro}.</h3>
    <h4>Pessoas na sua frente:</h4>
    <ul>
      ${fila[barbeiro]
        .slice(0, -1)
        .map(cliente => `<li>${cliente.nome}</li>`)
        .join('') || '<li>Ninguém na sua frente</li>'}
    </ul>
  `;

  form.reset();
});