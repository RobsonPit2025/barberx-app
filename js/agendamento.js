document.getElementById('formAgendamento').addEventListener('submit', function(e) {
  e.preventDefault();

  const nome = document.getElementById('nome').value;
  const celular = document.getElementById('celular').value;
  const barbeiro = document.getElementById('barbeiro').value;
  const mensagem = document.getElementById('mensagem').value;

  if (!nome || !celular || !barbeiro) {
    alert("Preencha todos os campos obrigatórios.");
    return;
  }

  // Simulação de fila
  const painel = document.getElementById('painelFila');
  const item = document.createElement('div');
  item.innerHTML = `<p><strong>Nome:</strong> ${nome}<br><strong>Barbeiro:</strong> ${barbeiro}<br><strong>Mensagem:</strong> ${mensagem}</p>`;
  painel.appendChild(item);

  alert("Corte marcado! Veja abaixo sua posição na fila.");
});

function aplicarMascaraCelular(input) {
  input.addEventListener("input", function(e) {
    let valor = input.value.replace(/\D/g, ""); // Remove tudo que não for dígito

    if (valor.length > 11) valor = valor.slice(0, 11); // Limita a 11 dígitos

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

// Aplicar ao campo
const campoAgendamentoCelular = document.getElementById("agendamentoCelular");
if (campoAgendamentoCelular) aplicarMascaraCelular(campoAgendamentoCelular);