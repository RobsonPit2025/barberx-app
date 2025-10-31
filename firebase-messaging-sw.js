// firebase-messaging-sw.js
// Service Worker compatível com Firebase Hosting e notificações visuais

importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

// Configuração do Firebase
firebase.initializeApp({
  apiKey: "AIzaSyCnsA89psIo30sQdBM9wFFzydnfOLcOKIc",
  authDomain: "barbex-app.firebaseapp.com",
  projectId: "barbex-app",
  storageBucket: "barbex-app.appspot.com",
  messagingSenderId: "91864465722",
  appId: "1:91864465722:web:7a3365582f3ca63e19d003"
});

const messaging = firebase.messaging();

// Quando a mensagem chega em segundo plano (aba fechada ou em segundo plano)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em background:', payload);

  const notificationTitle = payload.notification?.title || 'Nova notificação BarberX';
  const notificationOptions = {
    body: payload.notification?.body || 'Você recebeu uma atualização no seu agendamento.',
    icon: payload.notification?.icon || '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    data: payload.data || {},
  };

  // Exibe a notificação visual
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Quando o usuário clica na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('agendamento') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('https://barbex-app.web.app/agendamento');
      }
    })
  );
});