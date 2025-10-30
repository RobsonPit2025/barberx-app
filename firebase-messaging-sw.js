// firebase-messaging-sw.js
// Service worker para receber notificações FCM em background

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getMessaging, onBackgroundMessage } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-sw.js";

// Configuração do Firebase (mesma usada no agendamento.js)
const firebaseConfig = {
  apiKey: "AIzaSyBzqUQG0z7r6_0NfZ3Fz0lU6T5D_3Q5yYw",
  authDomain: "barbex-app.firebaseapp.com",
  projectId: "barbex-app",
  storageBucket: "barbex-app.appspot.com",
  messagingSenderId: "275897396550",
  appId: "1:275897396550:web:8a9c6e4f4d2b1e0f3d2c8a"
};

// Inicializa o app Firebase dentro do service worker
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Recebe mensagens em segundo plano (quando o app não está ativo)
onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em background:', payload);
  const notification = payload.notification || {};
  const title = notification.title || 'Notificação BarberX';
  const options = {
    body: notification.body || payload.data?.body || '',
    icon: notification.icon || '/icons/icon-192.png',
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});

// Trata clique na notificação (foca ou abre a página do app)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});