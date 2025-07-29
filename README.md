# 💈 BarberX App

Aplicativo moderno para barbearias com funcionalidades completas de **agendamento**, **galeria de cortes**, **fila virtual** e **painel administrativo**.

---

## ✨ Funcionalidades

### 👤 1. Acesso de Cliente
- Cadastro com nome, e-mail, celular (com máscara brasileira) e senha.
- Login simples.
- Agendamento com:
  - Escolha do barbeiro (Yure ou Pablo)
  - Mensagem personalizada
- Exibição de mensagem: **"Você é o número X" na fila**
- Restrição de novo agendamento enquanto estiver na fila.
- Acompanhamento visual da fila com nomes.

### 🛠️ 2. Acesso de Administrador
- Login exclusivo (`admin1@barberx.com` ou `admin2@barberx.com`)
- Painel com três seções:
  - **Fila do Dia**: Exibe os agendamentos ativos para cada barbeiro.
  - **Relatório Mensal**: Tabela com a quantidade de cortes feitos por barbeiro em cada mês.
  - **Adicionar Imagens**: Upload de fotos dos cortes, salvas conforme barbeiro.
- Frase motivacional do dia na tela principal do admin.
- Botão **"Corte Concluído"**: remove cliente da fila e libera novo agendamento.

---

## 📸 3. Portfólio de Cortes
- Galeria separada por barbeiro: Yure e Pablo
- As imagens são enviadas via painel admin
- A galeria pode ser acessada na página principal antes do login

---

## 🧠 Lógica da Fila
- Sistema de **fila em memória** para cada barbeiro
- Cada cliente recebe um número na fila ao agendar
- O cliente só pode agendar novamente após o corte ser concluído
- Painel do admin mostra os agendamentos em tempo real com opção de conclusão

---

## 🚀 Tecnologias Utilizadas
- HTML, CSS, JavaScript Puro
- Firebase Hosting (já implementado)
- Firebase Firestore e Auth (planejado para a última fase)
- Git & GitHub para versionamento

---

## 📁 Estrutura de Pastas
public/
├── index.html
├── agendamento.html
├── admin.html
├── css/
│   ├── index.css
│   ├── agendamento.css
│   └── admin.css
├── js/
│   ├── index.js
│   ├── agendamento.js
│   └── admin.js
└── img/ 

---

---

## 📌 Status do Projeto

✅ **Front-end concluído e funcionando**  
🚫 **Sem uso de localStorage**  
📦 **Firebase Auth e Firestore serão integrados após conclusão da lógica local**

---

## 🔗 Deploy

Hospedado via Firebase Hosting:  
🌐 [https://barbex-app.web.app](https://barbex-app.web.app)

---

## 📄 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

---

## 📫 Contato

Desenvolvido por **Robson Fernandes**  
📧 Email: robson302025@gmail.com

---

⭐ Se você curtiu esse projeto, deixa uma estrela no repositório!