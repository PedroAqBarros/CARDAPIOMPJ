import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBzGL3MFuCDUUmR8rY1eshqB8S5SRKBVZI",
  authDomain: "mapeju-cardapio.firebaseapp.com",
  projectId: "mapeju-cardapio",
  storageBucket: "mapeju-cardapio.firebasestorage.app",
  messagingSenderId: "1055368224770",
  appId: "1:1055368224770:web:f3a5771fc333f192a3071b",
  measurementId: "G-00FD2KZEGE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Habilitar persistência offline
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code == 'unimplemented') {
      console.log('The current browser does not support persistence.');
    }
});

// Configurar coleções do Firestore
const categoriesRef = collection(db, 'categories');
const productsRef = collection(db, 'products');
const cartsRef = collection(db, 'carts');

// Função para criar um ID único
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Função para mostrar notificação
function showNotification(message, type = 'info') {
  // Verificar se já existe uma notificação
  let notification = document.querySelector('.notification');
  
  if (notification) {
    // Remover notificação existente
    notification.remove();
  }
  
  // Criar nova notificação
  notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'exclamation-circle';
  
  notification.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span>${message}</span>
  `;
  
  // Adicionar ao corpo do documento
  document.body.appendChild(notification);
  
  // Remover após 3 segundos
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 500);
  }, 3000);
}

// Verificar estado de autenticação
auth.onAuthStateChanged(function(user) {
  const adminPanel = document.getElementById('admin-panel');
  const adminLoginBtn = document.getElementById('admin-login-btn');
  
  if (user) {
    // Usuário está logado
    console.log('Usuário autenticado:', user.email);
    
    // Mostrar email do usuário no painel administrativo
    const adminUserEmail = document.getElementById('admin-user-email');
    if (adminUserEmail) {
      adminUserEmail.textContent = user.email;
    }
    
    // Mostrar painel administrativo se o botão for clicado
    if (adminLoginBtn) {
      adminLoginBtn.addEventListener('click', function() {
        if (adminPanel) {
          adminPanel.style.display = 'block';
        }
      });
    }
  } else {
    // Usuário não está logado
    console.log('Usuário não autenticado');

    // Configurar botão para abrir modal de login
    if (adminLoginBtn) {
      adminLoginBtn.addEventListener('click', function() {
        const adminModal = document.getElementById('admin-modal');
        if (adminModal) {
          adminModal.style.display = 'block';
        }
      });
    }
  }
});

export { db, auth, categoriesRef, productsRef, cartsRef, generateId, showNotification };
