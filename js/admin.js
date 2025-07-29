// Mostrar agendamentos
const containerYuri = document.getElementById("agendamentosYuri");
const containerPablo = document.getElementById("agendamentosPablo");

function renderAgendamento(doc, container) {
  const div = document.createElement("div");
  div.classList.add("agendamento");
  div.innerHTML = `
    <p><strong>Nome:</strong> ${doc.nome}</p>
    <p><strong>Celular:</strong> ${doc.celular}</p>
    <p><strong>Mensagem:</strong> ${doc.mensagem}</p>
  `;
  container.appendChild(div);
}

onSnapshot(collection(db, "agendamentos"), (snapshot) => {
  containerYuri.innerHTML = "";
  containerPablo.innerHTML = "";

  snapshot.forEach((doc) => {
    const data = doc.data();
    const barbeiro = data.barbeiro?.toLowerCase();

    if (barbeiro === "yuri" || barbeiro === "yure") {
      renderAgendamento(data, containerYuri);
    } else if (barbeiro === "pablo") {
      renderAgendamento(data, containerPablo);
    }
  });
});