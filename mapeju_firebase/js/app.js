// Aplicação principal do cardápio digital com sincronização em tempo real
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
            
            sendOrderToWhatsApp();
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
        productsContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Carregando produtos...</div>';
        
        // Iniciar sincronização de produtos para a categoria selecionada
        productsListener = productsRef
            .where('categoryId', '==', categoryId)
            .orderBy('name')
            .onSnapshot(snapshot => {
                const products = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                renderProductsByCategory(products);
            }, error => {
                console.error('Erro ao sincronizar produtos:', error);
                showNotification('Erro ao carregar produtos', 'error');
                
                productsContainer.innerHTML = '<div class="error-message">Erro ao carregar produtos</div>';
            });
    }

    // Renderizar produtos por categoria
    function renderProductsByCategory(products) {
        productsContainer.innerHTML = '';
        
        if (products.length === 0) {
            productsContainer.innerHTML = '<div class="empty-message">Nenhum produto disponível nesta categoria</div>';
            return;
        }
        
        // Imagem em base64 minimalista (1x1 pixel transparente)
        const fallbackImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            
            // Usar a imagem base64 como fallback
            const imageUrl = product.image || fallbackImage;
            
            productCard.innerHTML = `
                <div class="product-image-container">
                    <img src="${imageUrl}" alt="${product.name}" class="product-image" 
                         onerror="this.src='${fallbackImage}'">
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    <p class="product-price">R$ ${parseFloat(product.price).toFixed(2)}</p>
                    <button class="add-to-cart-btn" data-id="${product.id}">
                        <i class="fas fa-cart-plus"></i> Adicionar
                    </button>
                </div>
            `;
            
            // Adicionar evento ao botão de adicionar ao carrinho
            const addToCartBtn = productCard.querySelector('.add-to-cart-btn');
            addToCartBtn.addEventListener('click', function() {
                const productId = this.getAttribute('data-id');
                cartManager.addToCart(productId);
                renderCart();
                updateCartBadge();
                
                // Feedback visual
                this.innerHTML = '<i class="fas fa-check"></i> Adicionado';
                this.classList.add('added-to-cart');
                
                // Restaurar após 1 segundo
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-cart-plus"></i> Adicionar';
                    this.classList.remove('added-to-cart');
                }, 1000);
            });
            
            productsContainer.appendChild(productCard);
        });
        
        // Adicionar botões de pedido rápido
        if (typeof whatsappIntegration !== 'undefined' && whatsappIntegration.addQuickOrderButtons) {
            setTimeout(whatsappIntegration.addQuickOrderButtons, 500);
        }
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

    // Função para enviar pedido via WhatsApp
    async function sendOrderToWhatsApp() {
        if (appData.cart.length === 0) {
            alert('Seu carrinho está vazio. Adicione produtos antes de fazer o pedido.');
            return false;
        }
        
        // Obter todos os produtos para gerar a mensagem
        const allProducts = await productManager.getProducts();
        
        // Variável total já é calculada no loop abaixo
        let totalPedido = 0;
        
        let message = '🛒 *Novo Pedido - Mapeju Doces* 🛒\n\n';
        message += '*Itens do Pedido:*\n';
        
        appData.cart.forEach(item => {
            const product = allProducts.find(prod => prod.id === item.productId);
            if (product) {
                const itemTotal = product.price * item.quantity;
                totalPedido += itemTotal;
                message += `• ${item.quantity}x ${product.name} - R$ ${itemTotal.toFixed(2)}\n`;
            }
        });
        
        message += `\n*Total: R$ ${totalPedido.toFixed(2)}*\n\n`;
        message += 'Por favor, confirme meu pedido com os dados para entrega. Obrigado!';
        
        const whatsappUrl = `https://wa.me/556294535053?text=${encodeURIComponent(message)}`;
        
        // Abrir WhatsApp em nova janela com propriedades seguras para evitar CORB
        const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        if (newWindow) {
            newWindow.opener = null;
        }
        
        // Mostrar confirmação
        showOrderConfirmation();
        
        return true;
    }

    // Mostrar confirmação de pedido
    function showOrderConfirmation() {
        // Criar elemento de confirmação
        const confirmationDiv = document.createElement('div');
        confirmationDiv.className = 'order-confirmation';
        confirmationDiv.innerHTML = `
            <p><i class="fas fa-check-circle"></i> Seu pedido foi enviado para o WhatsApp!</p>
            <p>Aguarde a confirmação da Mapeju Doces.</p>
        `;
        
        // Adicionar ao carrinho
        cartElement.appendChild(confirmationDiv);
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (confirmationDiv.parentNode) {
                confirmationDiv.parentNode.removeChild(confirmationDiv);
            }
        }, 5000);
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
