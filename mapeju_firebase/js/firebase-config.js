// Configuração do Firebase usando a API compat
// Importação não utilizada, apenas referência para documentação
// Neste arquivo usamos o método compat que não precisa de importação com import
// import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
// import { getFirestore, collection, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
// import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// Inicialização do Firebase com configuração do APP_CONFIG
let firebaseInitialized = false;

// Função para inicializar o Firebase quando as configurações estiverem disponíveis
function initializeFirebase() {
  if (firebaseInitialized) return;

  // Usar configuração do arquivo config.js
  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.FIREBASE_CONFIG) {
    try {
      // Inicializar o Firebase
      firebase.initializeApp(APP_CONFIG.FIREBASE_CONFIG);
      firebaseInitialized = true;
      console.log('Firebase inicializado com sucesso');
      
      // Configurações após inicialização
      setupFirebaseServices();
    } catch (error) {
      console.error('Erro ao inicializar Firebase:', error);
      showNotification('Erro ao inicializar o sistema. Por favor, verifique as configurações.', 'error');
    }
  } else {
    console.error('Configuração do Firebase não disponível');
    showNotification('Configuração do Firebase não encontrada. Verifique o arquivo secret.json.', 'error');
  }
}

// Configurar serviços do Firebase após a inicialização
function setupFirebaseServices() {
  // Obter instâncias do Firestore e Auth
  const db = firebase.firestore();
  const auth = firebase.auth();
  
  // Configurar Firestore para persistência offline usando apenas cache settings
  // sem chamar enableIndexedDbPersistence que está sendo descontinuado
  db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
    merge: true
  });
  
  // Configurar coleções do Firestore
  const categoriesRef = db.collection('categories');
  const productsRef = db.collection('products');
  const cartsRef = db.collection('carts');
  const imagesRef = db.collection('product_images'); // Mantido para migração
  
  // Definir variáveis globais para o Firebase
  window.db = db;
  window.auth = auth;
  window.firebase = firebase;
  window.categoriesRef = categoriesRef;
  window.productsRef = productsRef;
  window.cartsRef = cartsRef;
  window.imagesRef = imagesRef;
  
  // Configurar listener de autenticação
  setupAuthListener(auth);
  
  // Notificar que o Firebase está pronto
  window.dispatchEvent(new Event('firebase_initialized'));
}

// Configurar listener de autenticação
function setupAuthListener(auth) {
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
      // Usuário não autenticado
      console.log('Usuário não autenticado');
  
      // Configurar botão para abrir modal de login
      if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', function() {
          const adminModal = document.getElementById('admin-login-modal');
          if (adminModal) {
            adminModal.style.display = 'block';
          }
        });
      }
    }
  });
}

// Escutar evento de configurações carregadas
window.addEventListener('app_config_loaded', function() {
  initializeFirebase();
});

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

// Função para redimensionar imagem com compressão mais agressiva
function resizeImage(file, maxWidth = 400, maxHeight = 400, quality = 0.3) {
    return new Promise((resolve, reject) => {
        // Criar um FileReader para ler o arquivo
        const reader = new FileReader();
        reader.onload = function(e) {
            // Criar uma imagem a partir do resultado do FileReader
            const img = new Image();
            img.onload = function() {
                // Calcular novas dimensões mantendo a proporção
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * maxWidth / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * maxHeight / height);
                        height = maxHeight;
                    }
                }
                
                // Criar um canvas para redimensionar
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                // Desenhar a imagem redimensionada no canvas
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#FFFFFF'; // Fundo branco
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                
                // Converter para DataURL com a qualidade especificada
                let dataUrl;
                
                // Tentar com JPEG para melhor compressão se não for GIF
                if (file.type === 'image/gif') {
                    dataUrl = canvas.toDataURL('image/gif', quality);
                } else {
                    // Para todas as outras imagens, usar JPEG para melhor compressão
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }
                
                resolve(dataUrl);
            };
            
            img.onerror = function() {
                reject(new Error('Erro ao carregar a imagem'));
            };
            
            // Definir a source da imagem como o resultado do FileReader
            img.src = e.target.result;
        };
        
        reader.onerror = function() {
            reject(new Error('Erro ao ler o arquivo'));
        };
        
        // Ler o arquivo como DataURL
        reader.readAsDataURL(file);
    });
}

// Função para fazer upload de imagem
async function uploadProductImage(file) {
    if (!file) return '';
    
    try {
        // Verificar se é um arquivo de imagem
        if (!file.type.startsWith('image/')) {
            showNotification('O arquivo selecionado não é uma imagem válida.', 'error');
            return '';
        }
        
        // Gerar ID único para a imagem
        const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        
        try {
            // Redimensionar a imagem com compressão mais agressiva
            const resizedImageData = await resizeImage(file, 400, 400, 0.3);
            console.log('Imagem redimensionada com sucesso');
            
            // Salvar imagem diretamente no documento do produto
            // Não precisamos mais salvar em uma coleção separada
            console.log('Imagem processada com sucesso');
            showNotification('Imagem carregada com sucesso!', 'success');
            
            return resizedImageData; // Retorna diretamente o base64
            
        } catch (error) {
            console.error('Erro ao processar imagem:', error);
            showNotification('Erro ao processar a imagem. Tente com uma imagem menor.', 'error');
            return '';
        }
    } catch (error) {
        console.error('Erro ao processar a imagem:', error);
        showNotification('Erro ao processar a imagem', 'error');
        return '';
    }
}

// Função para carregar imagem
async function loadProductImage(imageData) {
    try {
        console.log('Tentando carregar imagem:', imageData);
        const defaultImage = '/mapeju_firebase/img/default-product.png';
        
        // Se não houver dados da imagem, retornar imagem padrão
        if (!imageData) {
            console.log('Dados da imagem inválidos, usando imagem padrão');
            return defaultImage;
        }
        
        // Se já for uma string base64, retornar diretamente
        if (imageData.startsWith('data:image')) {
            return imageData;
        }

        // Verificar se é uma URL do formato antigo
        if (imageData.startsWith('firestore-image://')) {
            try {
                // Tentar carregar a imagem do formato antigo
                const imageId = imageData.replace('firestore-image://', '');
                const imageDoc = await window.imagesRef.doc(imageId).get();
                
                if (!imageDoc.exists) {
                    console.log('Imagem não encontrada, usando padrão');
                    return defaultImage;
                }

                const imageInfo = imageDoc.data();
                
                if (imageInfo.type === 'direct-image' && imageInfo.data) {
                    // Se encontrarmos a imagem, vamos atualizar o produto para o novo formato
                    try {
                        // Obter o ID do produto atual
                        const productQuery = await window.productsRef.where('image', '==', imageData).get();
                        if (!productQuery.empty) {
                            const productDoc = productQuery.docs[0];
                            // Atualizar o produto com o novo formato
                            await productDoc.ref.update({
                                image: imageInfo.data
                            });
                            console.log('Produto atualizado para novo formato');
                        }
                    } catch (updateError) {
                        console.error('Erro ao atualizar produto:', updateError);
                    }
                    
                    return imageInfo.data;
                }
                
                // Se for chunked, vamos tentar carregar os chunks
                if (imageInfo.type === 'chunked-image') {
                    let fullImageData = '';
                    for (let i = 0; i < imageInfo.chunks; i++) {
                        const chunkDoc = await window.imagesRef.doc(`${imageId}_chunk_${i}`).get();
                        if (chunkDoc.exists) {
                            fullImageData += chunkDoc.data().data;
                        }
                    }
                    
                    if (fullImageData) {
                        // Atualizar o produto com o novo formato
                        try {
                            const productQuery = await window.productsRef.where('image', '==', imageData).get();
                            if (!productQuery.empty) {
                                const productDoc = productQuery.docs[0];
                                await productDoc.ref.update({
                                    image: fullImageData
                                });
                                console.log('Produto atualizado para novo formato');
                            }
                        } catch (updateError) {
                            console.error('Erro ao atualizar produto:', updateError);
                        }
                        
                        return fullImageData;
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar imagem antiga:', error);
            }
        }
        
        return defaultImage;
    } catch (error) {
        console.error('Erro ao carregar imagem:', error);
        return defaultImage;
    }
}

// Exportar objetos do Firebase para uso em outros scripts
window.appFirebase = {
  db: window.db,
  auth: window.auth,
  firebase: window.firebase,
  categoriesRef: window.categoriesRef,
  productsRef: window.productsRef,
  cartsRef: window.cartsRef,
  imagesRef: window.imagesRef,
  generateId,
  showNotification,
  uploadProductImage,
  loadProductImage,
  updateProduct: async function(productId, productData) {
    try {
        // Usar as referências globais
        await window.productsRef.doc(productId).update({
            ...productData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Erro ao atualizar produto:", error);
        throw error;
    }
  }
};
