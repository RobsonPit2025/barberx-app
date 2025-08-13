# 💈 BarberX - Sistema de Agendamento para Barbearia

O **BarberX** é um aplicativo web desenvolvido para facilitar o gerenciamento de agendamentos em uma barbearia. Ele oferece funcionalidades de login, agendamento com fila virtual, painel administrativo, relatório de cortes e galeria de imagens dos barbeiros.

---

## 🚀 Funcionalidades Implementadas

✅ Cadastro de usuários com Firebase Authentication  
✅ Login para clientes e administrador  
✅ Agendamento de cortes com fila virtual  
✅ Visualização da posição na fila para o cliente  
✅ Atualização em tempo real da fila de espera conforme cortes são concluídos  
✅ Painel administrativo exclusivo para barbeiros  
✅ Separação dos agendamentos por barbeiro (Yuri e Pablo)  
✅ Funcionalidade "Corte Concluído" para remover cliente da fila  
✅ Relatório mensal de cortes por barbeiro  
✅ Estrutura para upload de imagens (com Firebase Storage – ainda não ativado)  
✅ Galeria de portfólio dos barbeiros  
✅ Responsivo e leve, com navegação em SPA (Single Page Application)

---

## 📁 Estrutura de Arquivos

barberx-app/
├── index.html
├── admin.html
├── cadastro.html
├── login.html
├── imagens.html
├── css/
│   ├── index.css
│   ├── admin.css
├── js/
│   ├── index.js
│   ├── admin.js
│   ├── agendamento.js
│   ├── firebase-config.js
├── img/
│   ├── cortes/ (imagens da galeria)
├── public/
│   └── (para deploy no Firebase Hosting)

---

## 🧪 Tecnologias Utilizadas

- HTML5, CSS3 e JavaScript
- Firebase Authentication
- Firebase Firestore
- Firebase Hosting
- (Storage preparado, mas ainda não ativado)

---

## ⚠️ Observações

- A galeria de imagens atualmente utiliza arquivos locais.  
- Upload de imagem pelo painel só será possível após ativação do **Firebase Storage (Blaze Plan)**.
- A fila de agendamento é controlada por regras internas no código.
- A autenticação diferencia clientes e administradores por e-mail e senha.
- A posição do cliente na fila é atualizada dinamicamente sempre que um corte é concluído no painel admin.

---

## 👤 Desenvolvido por

**Robson Fernandes dos Santos**  
📍 Salvador - BA  
📧 robson302025@gmail.com  
🔗 [Meu GitHub](https://github.com/RobsonPit2025)