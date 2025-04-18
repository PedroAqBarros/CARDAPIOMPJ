document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const categoriesContainer = document.querySelector('.categories');
    const productsContainer = document.querySelector('.products');
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartTotalValue = document.getElementById('cart-total-value');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    const orderBtn = document.getElementById('order-btn');
    const emptyCartMessage = document.querySelector('.empty-cart');
    const emptyProductsMessage = document.querySelector('.empty-message');
    const floatingCartBtn = document.getElementById('floating-cart-btn');
    const cartBadge = document.getElementById('cart-badge');
    const cartElement = document.querySelector('.cart');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const categoriesLoading = document.getElementById('categories-loading');

    // Referenciar objetos do Firebase vindos da API compat
    const { db, auth, categoriesRef, productsRef, cartsRef, generateId, showNotification } = window.appFirebase;

    // Variáveis para controle de estado
    let selectedCategoryId = null;
    let categoriesListener = null;
    let productsListener = null;
    
    // Dados da aplicação
    const appData = {
        cart: []
    };

    // Gerenciador de produtos
    const productManager = {
        async getProducts() {
            try {
                const snapshot = await productsRef.get();
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Erro ao obter produtos:', error);
                return [];
            }
        }
    };

    // Gerenciador de carrinho
    const cartManager = {
        addToCart(productId) {
            const existingItem = appData.cart.find(item => item.productId === productId);
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                appData.cart.push({
                    productId,
                    quantity: 1
                });
            }
            
            // Salvar carrinho no localStorage
            this.saveCart();
            
            return appData.cart;
        },
        
        decreaseQuantity(productId) {
            const existingItem = appData.cart.find(item => item.productId === productId);
            
            if (existingItem) {
                if (existingItem.quantity > 1) {
                    existingItem.quantity -= 1;
                } else {
                    // Remover item se a quantidade for 1
                    this.removeFromCart(productId);
                    return appData.cart;
                }
                
                // Salvar carrinho no localStorage
                this.saveCart();
            }
            
            return appData.cart;
        },
        
        removeFromCart(productId) {
            appData.cart = appData.cart.filter(item => item.productId !== productId);
            
            // Salvar carrinho no localStorage
            this.saveCart();
            
            return appData.cart;
        },
        
        clearCart() {
            appData.cart = [];
            
            // Salvar carrinho no localStorage
            this.saveCart();
            
            return appData.cart;
        },
        
        loadCart() {
            const savedCart = localStorage.getItem('mapeju_cart');
            
            if (savedCart) {
                try {
                    appData.cart = JSON.parse(savedCart);
                } catch (error) {
                    console.error('Erro ao carregar carrinho:', error);
                    appData.cart = [];
                }
            }
            
            return appData.cart;
        },
        
        saveCart() {
            localStorage.setItem('mapeju_cart', JSON.stringify(appData.cart));
        },
        
        async getCartTotal() {
            // Obter todos os produtos para calcular o total
            const allProducts = await productManager.getProducts();
            
            // Calcular total do carrinho
            return appData.cart.reduce((total, item) => {
                const product = allProducts.find(prod => prod.id === item.productId);
                if (product) {
                    return total + (product.price * item.quantity);
                }
                return total;
            }, 0);
        }
    };

    // Inicializar a aplicação
    initApp();

    async function initApp() {
        // Carregar carrinho do localStorage
        cartManager.loadCart();
        
        // Configurar eventos
        setupEventListeners();
        
        // Renderizar carrinho
        renderCart();
        
        // Atualizar badge do carrinho
        updateCartBadge();
        
        // Iniciar sincronização em tempo real
        startRealtimeSync();
    }

    function setupEventListeners() {
        // Botão para limpar carrinho
        clearCartBtn.addEventListener('click', function() {
            if (confirm('Tem certeza que deseja limpar o carrinho?')) {
                cartManager.clearCart();
                renderCart();
                updateCartBadge();
            }
        });
        
        // Botão para fazer pedido via WhatsApp
        orderBtn.addEventListener('click', function() {
            if (appData.cart.length === 0) {
                alert('Seu carrinho está vazio. Adicione produtos antes de fazer o pedido.');
                return;
            }
            
            sendOrder();
        });
        
        // Botão flutuante do carrinho (mobile)
        if (floatingCartBtn) {
            floatingCartBtn.addEventListener('click', function() {
                cartElement.classList.add('open');
            });
        }
        
        // Botão para fechar o carrinho (mobile)
        if (closeCartBtn) {
            closeCartBtn.addEventListener('click', function() {
                cartElement.classList.remove('open');
            });
        }
    }

    // Iniciar sincronização em tempo real
    function startRealtimeSync() {
        // Sincronizar categorias em tempo real
        if (categoriesListener) {
            categoriesListener();
        }
        
        categoriesListener = categoriesRef.orderBy('name').onSnapshot(snapshot => {
            const categories = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            renderCategories(categories);
            
            // Se houver categorias e nenhuma estiver selecionada, selecionar a primeira
            if (categories.length > 0 && !selectedCategoryId) {
                selectCategory(categories[0].id);
            }
            
            // Ocultar spinner de carregamento
            if (categoriesLoading) {
                categoriesLoading.style.display = 'none';
            }
        }, error => {
            console.error('Erro ao sincronizar categorias:', error);
            showNotification('Erro ao carregar categorias', 'error');
            
            // Ocultar spinner de carregamento em caso de erro
            if (categoriesLoading) {
                categoriesLoading.style.display = 'none';
                categoriesLoading.innerHTML = '<p class="error-message">Erro ao carregar categorias</p>';
            }
        });
    }

    // Renderizar categorias
    function renderCategories(categories) {
        // Manter referência aos botões existentes para preservar event listeners
        const existingButtons = {};
        document.querySelectorAll('.category-btn').forEach(btn => {
            existingButtons[btn.getAttribute('data-id')] = btn;
        });
        
        // Limpar container, mantendo o spinner de carregamento
        Array.from(categoriesContainer.children).forEach(child => {
            if (!child.id || child.id !== 'categories-loading') {
                categoriesContainer.removeChild(child);
            }
        });
        
        if (categories.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'Nenhuma categoria disponível';
            categoriesContainer.appendChild(emptyMessage);
            return;
        }
        
        categories.forEach(category => {
            let button;
            
            // Reutilizar botão existente ou criar novo
            if (existingButtons[category.id]) {
                button = existingButtons[category.id];
                button.textContent = category.name;
            } else {
                button = document.createElement('button');
                button.className = 'category-btn';
                button.setAttribute('data-id', category.id);
                button.textContent = category.name;
                
                button.addEventListener('click', function() {
                    selectCategory(category.id);
                });
            }
            
            // Adicionar classe active se for a categoria selecionada
            if (category.id === selectedCategoryId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
            
            categoriesContainer.appendChild(button);
        });
    }

    // Selecionar categoria e mostrar seus produtos
    function selectCategory(categoryId) {
        selectedCategoryId = categoryId;
        
        // Atualizar botões de categoria
        document.querySelectorAll('.category-btn').forEach(btn => {
            if (btn.getAttribute('data-id') === categoryId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Cancelar listener anterior de produtos
        if (productsListener) {
            productsListener();
        }
        
        // Mostrar indicador de carregamento
        productsContainer.innerHTML = '<div class="loading">Carregando produtos...</div>';
        
        // Iniciar sincronização de produtos para a categoria selecionada
        productsListener = productsRef
            .where('categoryId', '==', categoryId)
            .onSnapshot(snapshot => {
                // Limpar container
                productsContainer.innerHTML = '';

                if (snapshot.empty) {
                    // Mostrar mensagem quando não há produtos
                    const emptyMessage = document.createElement('div');
                    emptyMessage.className = 'empty-products-message';
                    emptyMessage.innerHTML = `
                        <i class="fas fa-box-open"></i>
                        <p>Nenhum produto encontrado nesta categoria</p>
                    `;
                    productsContainer.appendChild(emptyMessage);
                    return;
                }

                // Filtrar produtos ativos e ordenar por nome
                const products = snapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                    .filter(product => product.active !== false)
                    .sort((a, b) => a.name.localeCompare(b.name));

                // Renderizar produtos
                products.forEach(product => {
                    const productElement = document.createElement('div');
                    productElement.className = 'product-card';
                    
                    // Tratamento da imagem com fallback
                    const imageContainer = document.createElement('div');
                    imageContainer.className = 'product-image-container';
                    
                    const imageElement = document.createElement('img');
                    imageElement.className = 'product-image loading';
                    imageElement.alt = product.name;

                    // Verificar todas as possíveis propriedades de imagem
                    const imageUrl = product.image || product.imageUrl || product.imagemUrl || null;
                    
                    if (!imageUrl) {
                        imageElement.src = '/mapeju_firebase/img/default-product.png';
                        imageElement.classList.remove('loading');
                    } else if (imageUrl.startsWith('firestore-image://')) {
                        // Carregar imagem do Firestore
                        window.appFirebase.loadProductImage(imageUrl)
                            .then(dataUrl => {
                                if (dataUrl) {
                                    imageElement.src = dataUrl;
                                } else {
                                    imageElement.src = '/mapeju_firebase/img/default-product.png';
                                }
                                imageElement.classList.remove('loading');
                                console.log('Imagem carregada:', imageUrl);
                            })
                            .catch(error => {
                                console.error('Erro ao carregar imagem:', error);
                                imageElement.src = '/mapeju_firebase/img/default-product.png';
                                imageElement.classList.remove('loading');
                            });
                    } else {
                        // URL direta
                        imageElement.src = imageUrl;
                        imageElement.classList.remove('loading');
                    }

                    imageElement.onerror = function() {
                        this.src = '/mapeju_firebase/img/default-product.png';
                        this.classList.remove('loading');
                    };

                    imageContainer.appendChild(imageElement);

                    productElement.innerHTML = `
                        <div class="product-info">
                            <h3 class="product-name">${product.name}</h3>
                            <p class="product-description">${product.description || ''}</p>
                            <p class="product-price">R$ ${product.price.toFixed(2)}</p>
                            <button class="add-to-cart-btn" data-product-id="${product.id}">
                                <i class="fas fa-plus"></i> Adicionar
                            </button>
                        </div>
                    `;

                    // Inserir container de imagem no início do card
                    productElement.insertBefore(imageContainer, productElement.firstChild);

                    // Adicionar evento ao botão
                    const addButton = productElement.querySelector('.add-to-cart-btn');
                    addButton.addEventListener('click', function() {
                        cartManager.addToCart(product.id);
                        renderCart();
                        updateCartBadge();
                        showNotification('Produto adicionado ao carrinho!', 'success');
                    });

                    productsContainer.appendChild(productElement);
                });
            }, error => {
                console.error('Erro ao carregar produtos:', error);
                productsContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Erro ao carregar produtos. Por favor, tente novamente.</p>
                    </div>
                `;
            });
    }

    // Renderizar carrinho
    async function renderCart() {
        if (!cartItemsContainer) return;
        
        cartItemsContainer.innerHTML = '';
        let total = 0;
        
        if (appData.cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart">Seu carrinho está vazio</p>';
            if (cartTotalValue) {
                cartTotalValue.textContent = 'R$ 0,00';
            }
            return;
        }
        
        // Obter todos os produtos para poder exibir informações no carrinho
        const allProducts = await productManager.getProducts();
        
        appData.cart.forEach(item => {
            const product = allProducts.find(prod => prod.id === item.productId);
            if (product) {
                const itemTotal = product.price * item.quantity;
                total += itemTotal;
                
                const cartItem = document.createElement('div');
                cartItem.className = 'cart-item';
                cartItem.innerHTML = `
                    <div class="cart-item-info">
                        <h4>${product.name}</h4>
                        <p>R$ ${product.price.toFixed(2)} x ${item.quantity}</p>
                    </div>
                    <div class="cart-item-total">
                        R$ ${itemTotal.toFixed(2)}
                    </div>
                    <div class="cart-item-actions">
                        <button class="quantity-btn minus" data-id="${item.productId}">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn plus" data-id="${item.productId}">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="remove-btn" data-id="${item.productId}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                // Adicionar eventos aos botões
                const minusBtn = cartItem.querySelector('.minus');
                const plusBtn = cartItem.querySelector('.plus');
                const removeBtn = cartItem.querySelector('.remove-btn');
                
                minusBtn.addEventListener('click', function() {
                    const productId = this.getAttribute('data-id');
                    cartManager.decreaseQuantity(productId);
                    renderCart();
                    updateCartBadge();
                });
                
                plusBtn.addEventListener('click', function() {
                    const productId = this.getAttribute('data-id');
                    cartManager.addToCart(productId);
                    renderCart();
                    updateCartBadge();
                });
                
                removeBtn.addEventListener('click', function() {
                    const productId = this.getAttribute('data-id');
                    if (confirm('Tem certeza que deseja remover este item?')) {
                        cartManager.removeFromCart(productId);
                        renderCart();
                        updateCartBadge();
                    }
                });
                
                cartItemsContainer.appendChild(cartItem);
            }
        });
        
        // Atualizar total
        if (cartTotalValue) {
            cartTotalValue.textContent = `R$ ${total.toFixed(2)}`;
        }
    }

    // Atualizar badge do carrinho
    function updateCartBadge() {
        if (!cartBadge) return;
        
        const totalItems = appData.cart.reduce((total, item) => total + item.quantity, 0);
        cartBadge.textContent = totalItems;
        
        if (totalItems === 0) {
            cartBadge.style.display = 'none';
        } else {
            cartBadge.style.display = 'flex';
        }
    }

    // Função para enviar pedido
    function sendOrder() {
        const cartItems = getCartItems();
        if (cartItems.length === 0) {
            showNotification('Adicione itens ao carrinho antes de enviar o pedido', 'error');
            return;
        }
        
        // Usar a nova função de checkout
        window.whatsappIntegration.sendToWhatsApp(cartItems);
    }

    // Expor funções globalmente
    window.cardapioApp = {
        renderCart,
        updateCartBadge,
        sendOrderToWhatsApp,
        showOrderConfirmation
    };

    // Gerenciar modal de política de privacidade
    const privacyLink = document.getElementById('privacy-link');
    const privacyModal = document.getElementById('privacy-modal');
    const privacyClose = document.querySelector('.privacy-close');
    
    if (privacyLink && privacyModal) {
        privacyLink.addEventListener('click', function(e) {
            e.preventDefault();
            privacyModal.style.display = 'block';
        });
        
        if (privacyClose) {
            privacyClose.addEventListener('click', function() {
                privacyModal.style.display = 'none';
            });
        }
        
        window.addEventListener('click', function(e) {
            if (e.target === privacyModal) {
                privacyModal.style.display = 'none';
            }
        });
    }
});
