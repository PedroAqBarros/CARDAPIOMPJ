document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const categoriesContainer = document.querySelector('.categories');
    const productsContainer = document.querySelector('.products');
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartTotalValue = document.getElementById('cart-total-value');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    const orderBtn = document.getElementById('order-btn');
    const emptyCartMessage = null;
    const emptyProductsMessage = document.querySelector('.empty-message');
    const floatingCartBtn = document.getElementById('floating-cart-btn');
    const cartBadge = document.getElementById('cart-badge');
    const cartElement = document.querySelector('.cart');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const categoriesLoading = document.getElementById('categories-loading');

    // Verificar se o Firebase foi inicializado corretamente
    if (!window.appFirebase) {
        console.error('Firebase não inicializado. Verifique se os scripts do Firebase foram carregados corretamente.');
        showStartupError('Não foi possível conectar ao banco de dados. Por favor, recarregue a página.');
        return;
    }

    // Referenciar objetos do Firebase
    const { db, auth, categoriesRef, productsRef, cartsRef, generateId, showNotification } = window.appFirebase;

    // Variáveis para controle de estado
    let selectedCategoryId = null;
    let categoriesListener = null;
    let productsListener = null;
    
    // Dados da aplicação
    const appData = {
        cart: []
    };

    // Função para mostrar erro de inicialização
    function showStartupError(message) {
        // Mostrar mensagem de erro para o usuário
        const errorBanner = document.createElement('div');
        errorBanner.style.backgroundColor = '#f8d7da';
        errorBanner.style.color = '#721c24';
        errorBanner.style.padding = '10px';
        errorBanner.style.margin = '10px 0';
        errorBanner.style.borderRadius = '4px';
        errorBanner.style.textAlign = 'center';
        errorBanner.innerHTML = `
            <i class="fas fa-exclamation-circle"></i> 
            ${message}
            <br>
            <button id="reload-btn" style="margin-top: 10px; padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Recarregar Página
            </button>
        `;
        
        // Inserir no topo do conteúdo
        document.querySelector('.container').prepend(errorBanner);
        
        // Adicionar listener para o botão de recarregar
        document.getElementById('reload-btn').addEventListener('click', () => {
            window.location.reload();
        });
    }

    // Gerenciador de produtos
    const productManager = {
        async getProducts() {
            try {
                const snapshot = await window.appFirebase.productsRef.get();
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
        init: function() {
            console.log('Inicializando o gerenciador de carrinho');
            if (localStorage.getItem('cart') === null) {
                localStorage.setItem('cart', '[]');
            }
            
            // Definir explicitamente o appData.cart com o conteúdo do localStorage
            try {
                appData.cart = JSON.parse(localStorage.getItem('cart')) || [];
                console.log('Cart inicializado com', appData.cart.length, 'itens do localStorage');
            } catch (e) {
                console.error('Erro ao carregar carrinho do localStorage:', e);
                appData.cart = [];
                localStorage.setItem('cart', '[]');
            }
        },
        
        // Método de compatibilidade para manter as chamadas antigas funcionando
        loadCart: function() {
            console.log('loadCart chamado, usando init()');
            this.init();
            return appData.cart;
        },
        
        getCart: function() {
            try {
                return JSON.parse(localStorage.getItem('cart')) || [];
            } catch (e) {
                console.error('Erro ao ler carrinho do localStorage:', e);
                return [];
            }
        },
        
        // Salvar o carrinho
        saveCart: function() {
            localStorage.setItem('cart', JSON.stringify(appData.cart));
        },
        
        // Adicionar ao carrinho
        addToCart: function(product) {
            console.log('Adicionando ao carrinho:', product);
            const existingItemIndex = appData.cart.findIndex(item => 
                item.productId === product.id && 
                (!item.selectedFlavors || item.selectedFlavors.length === 0)
            );
            
            if (existingItemIndex !== -1) {
                appData.cart[existingItemIndex].quantity += 1;
            } else {
                appData.cart.push({
                    productId: product.id,
                    title: product.title,
                    price: product.price,
                    quantity: 1
                });
            }
            
            this.saveCart();
            renderCart();
            updateCartBadge();
        },
        
        // Adicionar ao carrinho com sabores
        addToCartWithFlavor: function(product, selectedFlavors) {
            console.log('Adicionando ao carrinho com sabores:', product, selectedFlavors);
            
            // Garantir que selectedFlavors seja sempre um array
            if (!Array.isArray(selectedFlavors)) {
                selectedFlavors = selectedFlavors ? [selectedFlavors] : [];
            }
            
            // Log de debug dos sabores
            console.log('Sabores selecionados:', selectedFlavors.map(f => f.name));
            
            // Procurar se já existe um item com os mesmos sabores
            const existingItemIndex = appData.cart.findIndex(item => 
                item.productId === product.id && 
                this.areFlavorsEqual(item.selectedFlavors || [], selectedFlavors)
            );
            
            if (existingItemIndex !== -1) {
                appData.cart[existingItemIndex].quantity += 1;
            } else {
                // Criar novo item com os sabores selecionados
                appData.cart.push({
                    productId: product.id,
                    title: product.title,
                    price: parseFloat(product.price || 0),
                    quantity: 1,
                    selectedFlavors: JSON.parse(JSON.stringify(selectedFlavors)) // Cópia profunda para evitar referências
                });
            }
            
            this.saveCart();
            renderCart();
            updateCartBadge();
        },
        
        // Verificar se os arrays de sabores são iguais
        areFlavorsEqual: function(flavors1, flavors2) {
            if (!flavors1 || !flavors2) return false;
            if (flavors1.length !== flavors2.length) return false;
            
            // Comparar cada sabor pelo nome (propriedade mais confiável)
            const names1 = flavors1.map(f => f && f.name ? f.name : '').sort();
            const names2 = flavors2.map(f => f && f.name ? f.name : '').sort();
            
            for (let i = 0; i < names1.length; i++) {
                if (names1[i] !== names2[i]) return false;
            }
            
            return true;
        },
        
        // Remover do carrinho
        removeFromCart: function(productId, selectedFlavors = []) {
            console.log('Removendo do carrinho:', productId, selectedFlavors);
            
            const itemIndex = appData.cart.findIndex(item => 
                item.productId === productId && 
                this.areFlavorsEqual(item.selectedFlavors || [], selectedFlavors)
            );
            
            if (itemIndex !== -1) {
                appData.cart.splice(itemIndex, 1);
                this.saveCart();
            }
        },
        
        // Aumentar quantidade
        increaseQuantity: function(productId, selectedFlavors = []) {
            console.log('Aumentando quantidade:', productId, selectedFlavors);
            
            const itemIndex = appData.cart.findIndex(item => 
                item.productId === productId && 
                this.areFlavorsEqual(item.selectedFlavors || [], selectedFlavors)
            );
            
            if (itemIndex !== -1) {
                appData.cart[itemIndex].quantity += 1;
                this.saveCart();
            }
        },
        
        // Diminuir quantidade
        decreaseQuantity: function(productId, selectedFlavors = []) {
            console.log('Diminuindo quantidade:', productId, selectedFlavors);
            
            const itemIndex = appData.cart.findIndex(item => 
                item.productId === productId && 
                this.areFlavorsEqual(item.selectedFlavors || [], selectedFlavors)
            );
            
            if (itemIndex !== -1) {
                if (appData.cart[itemIndex].quantity > 1) {
                    appData.cart[itemIndex].quantity -= 1;
                } else {
                    appData.cart.splice(itemIndex, 1);
                }
                this.saveCart();
            }
        },
        
        // Limpar carrinho
        clearCart: function() {
            appData.cart = [];
            this.saveCart();
        }
    };

    // Função auxiliar para adicionar ao carrinho com opção de sabor
    async function addToCartWithFlavor(productId, flavor) {
        console.log('Adicionando ao carrinho com flavor:', productId, flavor);
        
        try {
            // Obter informações completas do produto
            const productInfo = await getProductDetails(productId);
            console.log('Informações do produto obtidas:', productInfo);
            
            // Se não tiver flavor, adicionar sem sabor
            if (!flavor) {
                cartManager.addToCart(productInfo);
                showNotification('Produto adicionado ao carrinho!', 'success');
                return;
            }
            
            // Tratar diferentes formatos de flavor
            let selectedFlavors = [];
            
            if (Array.isArray(flavor)) {
                // Caso de múltiplos sabores - filtrar sabores inválidos
                selectedFlavors = flavor
                    .filter(f => f && typeof f === 'object' && f.name) // Garantir que cada sabor seja um objeto válido com nome
                    .map(f => {
                        // Garantir que o preço extra seja um número
                        if (f.extraPrice) {
                            f.extraPrice = parseFloat(f.extraPrice) || 0;
                        } else {
                            f.extraPrice = 0;
                        }
                        return f;
                    });
            } else if (typeof flavor === 'object' && flavor !== null && flavor.name) {
                // Caso de um único sabor - garantir que o preço extra seja um número
                const f = {...flavor}; // Criar uma cópia para não modificar o original
                if (f.extraPrice) {
                    f.extraPrice = parseFloat(f.extraPrice) || 0;
                } else {
                    f.extraPrice = 0;
                }
                selectedFlavors = [f];
            }
            
            // Log para depuração
            const flavorNames = selectedFlavors.map(f => f.name).join(', ');
            console.log(`Sabores formatados para adicionar ao carrinho: ${flavorNames || 'nenhum'}`);
            
            // Verificar se existem sabores válidos após o processamento
            if (selectedFlavors.length === 0) {
                console.warn('Nenhum sabor válido após processamento, adicionando produto sem sabor');
                cartManager.addToCart(productInfo);
            } else {
                // Chamar a função do cartManager com os sabores processados
                cartManager.addToCartWithFlavor(productInfo, selectedFlavors);
            }
        } catch (error) {
            console.error('Erro ao processar produto ou sabores:', error);
            showNotification('Erro ao adicionar produto ao carrinho', 'error');
        }
        
        showNotification('Produto adicionado ao carrinho!', 'success');
    }

    // Inicializar a aplicação
    initApp();

    // Função para garantir que o carrinho seja exibido corretamente
    function fixCartDisplay() {
        // Verificar se há itens no carrinho
        if (Array.isArray(appData.cart) && appData.cart.length > 0) {
            // Remover qualquer mensagem de carrinho vazio
            const emptyMessages = document.querySelectorAll('.empty-cart-message');
            if (emptyMessages.length > 0) {
                console.log('Corrigindo exibição do carrinho: removendo mensagens de vazio');
                emptyMessages.forEach(msg => msg.remove());
            }
            
            // Verificar se há itens visíveis no carrinho
            const cartItems = document.querySelectorAll('.cart-item');
            if (cartItems.length === 0) {
                console.log('Itens do carrinho não estão visíveis. Forçando renderização.');
                renderCart();
            }
        }
    }

    // Executar a correção após a inicialização e periodicamente
    setTimeout(fixCartDisplay, 500);
    setInterval(fixCartDisplay, 2000);

    async function initApp() {
        // Inicializar o carrinho do localStorage
        try {
            console.log('Inicializando aplicação...');
            cartManager.loadCart();
            
            // Verificar se o carrinho foi carregado corretamente
            console.log('Carrinho inicializado com', appData.cart.length, 'itens');
            
            // Configurar eventos
            setupEventListeners();
            
            // Renderizar carrinho
            renderCart();
            
            // Atualizar badge do carrinho
            updateCartBadge();
            
            // Iniciar sincronização em tempo real
            startRealtimeSync();
        } catch (error) {
            console.error('Erro ao inicializar aplicação:', error);
            showStartupError('Houve um erro ao inicializar a aplicação. Por favor, recarregue a página.');
        }
    }

    function setupEventListeners() {
        // Botão de login do admin
        const adminLoginBtn = document.getElementById('admin-login-btn');
        if (adminLoginBtn) {
            adminLoginBtn.addEventListener('click', () => {
                const adminLoginModal = document.getElementById('admin-login-modal');
                if (adminLoginModal) {
                    adminLoginModal.style.display = 'block';
                }
            });
        }

        // Botão de compartilhar cardápio
        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', function() {
                if (navigator.share) {
                    navigator.share({
                        title: 'Cardápio Mapeju Doces',
                        text: 'Confira o cardápio digital da Mapeju Doces!',
                        url: window.location.href
                    })
                    .then(() => console.log('Cardápio compartilhado com sucesso!'))
                    .catch((error) => console.error('Erro ao compartilhar:', error));
                } else {
                    // Fallback para navegadores que não suportam a Web Share API
                    prompt('Copie o link abaixo para compartilhar o cardápio:', window.location.href);
                }
            });
        }

        // Botão de fechar modal de login
        const closeLoginBtn = document.querySelector('#admin-login-modal .close');
        if (closeLoginBtn) {
            closeLoginBtn.addEventListener('click', () => {
                const adminLoginModal = document.getElementById('admin-login-modal');
                if (adminLoginModal) {
                    adminLoginModal.style.display = 'none';
                }
            });
        }

        // Adicionar listener para o input de endereço
        const addressInput = document.getElementById('customer-address');
        if (addressInput) {
            addressInput.addEventListener('input', debounce(calculateDeliveryFee, 500));
        }

        // Fechar modais quando clicar fora
        window.addEventListener('click', (event) => {
            const adminLoginModal = document.getElementById('admin-login-modal');
            const adminPanel = document.getElementById('admin-panel');
            
            if (event.target === adminLoginModal) {
                adminLoginModal.style.display = 'none';
            }
            if (event.target === adminPanel) {
                adminPanel.style.display = 'none';
            }
        });

        // Botão para limpar carrinho
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', function() {
                if (confirm('Tem certeza que deseja limpar o carrinho?')) {
                    cartManager.clearCart();
                    renderCart();
                    updateCartBadge();
                }
            });
        }
        
        // Botão para fazer pedido via WhatsApp
        if (orderBtn) {
            orderBtn.addEventListener('click', async function() {
                if (appData.cart.length === 0) {
                    alert('Seu carrinho está vazio. Adicione produtos antes de fazer o pedido.');
                    return;
                }
                
                await sendWhatsAppOrder();
            });
        }
        
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
        
        // Verificar se o checkout está funcionando corretamente
        // Isso serve apenas para debug, a função sendToWhatsApp já configura o formulário
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            console.log('Formulário de checkout encontrado');
            // Adicionar listener para verificar se o evento submit está sendo disparado
            checkoutForm.addEventListener('submit', function(e) {
                console.log('Evento submit do formulário de checkout capturado manualmente');
                // Não prevenir o comportamento padrão aqui, deixar a função sendToWhatsApp lidar com isso
            });
        }
    }

    // Iniciar sincronização em tempo real
    function startRealtimeSync() {
        // Cancelar listeners anteriores
        if (categoriesListener) {
            categoriesListener();
        }
        
        // Iniciar sincronização de categorias
        categoriesListener = window.appFirebase.categoriesRef.orderBy('name').onSnapshot(snapshot => {
            const categories = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            renderCategories(categories);
            
            // Se houver uma categoria selecionada, manter a seleção
            if (selectedCategoryId) {
                // Verificar se a categoria ainda existe
                const categoryExists = categories.some(cat => cat.id === selectedCategoryId);
                if (categoryExists) {
                    selectCategory(selectedCategoryId);
                } else if (categories.length > 0) {
                    // Se a categoria não existir mais, selecionar a primeira
                    selectCategory(categories[0].id);
                }
            } else if (categories.length > 0) {
                // Se não houver categoria selecionada, selecionar a primeira
                selectCategory(categories[0].id);
            }
        }, error => {
            console.error('Erro ao carregar categorias:', error);
            if (categoriesLoading) {
                categoriesLoading.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i> Erro ao carregar categorias
                    </div>
                `;
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
            
            // Ocultar o spinner de carregamento
            if (categoriesLoading) {
                categoriesLoading.style.display = 'none';
            }
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
        
        // Ocultar o spinner de carregamento após renderizar as categorias
        if (categoriesLoading) {
            categoriesLoading.style.display = 'none';
        }
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
        productsListener = window.appFirebase.productsRef
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

                // Filtrar produtos disponíveis e ordenar por nome
                const products = snapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                    .filter(product => product.available !== false) // Mostrar apenas produtos disponíveis
                    .sort((a, b) => a.name.localeCompare(b.name));

                if (products.length === 0) {
                    // Mostrar mensagem quando não há produtos disponíveis
                    const emptyMessage = document.createElement('div');
                    emptyMessage.className = 'empty-products-message';
                    emptyMessage.innerHTML = `
                        <i class="fas fa-box-open"></i>
                            <p>Não há produtos disponíveis nesta categoria no momento</p>
                    `;
                    productsContainer.appendChild(emptyMessage);
                    return;
                }

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

                    // Verificar se o produto tem opções de sabor
                    const hasFlavors = product.hasFlavors === true && Array.isArray(product.flavors) && product.flavors.length > 0;
                    
                    // Gerar HTML para adicionar ao carrinho com ou sem seleção de sabor
                    let addToCartHtml = '';
                    
                    if (hasFlavors) {
                        // Verificar se o produto permite múltiplos sabores
                        const allowMultipleFlavors = product.allowMultipleFlavors === true;
                        const flavorQuantity = product.flavorQuantity || 1;
                        
                        let flavorSelectionHtml = '';
                        
                        if (allowMultipleFlavors) {
                            // Criar seleção múltipla com checkboxes (inicialmente escondida)
                            flavorSelectionHtml = `
                                <div class="product-flavors multiple">
                                    <button type="button" class="flavor-toggle-btn">Selecionar sabores</button>
                                    <div class="flavor-selection-container" style="display: none;">
                                        <label>Escolha ${flavorQuantity} sabores:</label>
                                        <div class="flavor-checkbox-container">`;
                                    
                            product.flavors.forEach((flavor, index) => {
                                const extraPriceText = flavor.extraPrice > 0 ? ` (+R$ ${flavor.extraPrice.toFixed(2)})` : '';
                                flavorSelectionHtml += `
                                    <div class="flavor-checkbox">
                                        <input type="checkbox" id="flavor-${product.id}-${index}" 
                                               class="flavor-select-checkbox" data-index="${index}" 
                                               data-max-selection="${flavorQuantity}">
                                        <label for="flavor-${product.id}-${index}">${flavor.name}${extraPriceText}</label>
                                    </div>`;
                            });
                            
                            flavorSelectionHtml += `
                                        </div>
                                        <p class="flavor-selection-count">Selecione ${flavorQuantity} sabores</p>
                                    </div>
                                </div>`;
                        } else {
                            // Dropdown para seleção única (inicialmente escondido)
                            let flavorOptionsHtml = '';
                            product.flavors.forEach((flavor, index) => {
                                const extraPriceText = flavor.extraPrice > 0 ? ` (+R$ ${flavor.extraPrice.toFixed(2)})` : '';
                                flavorOptionsHtml += `<option value="${index}">${flavor.name}${extraPriceText}</option>`;
                            });
                            
                            flavorSelectionHtml = `
                                <div class="product-flavors">
                                    <button type="button" class="flavor-toggle-btn">Selecionar sabor</button>
                                    <div class="flavor-selection-container" style="display: none;">
                                        <label for="flavor-select-${product.id}">Escolha o sabor:</label>
                                        <select id="flavor-select-${product.id}" class="flavor-select">
                                            ${flavorOptionsHtml}
                                        </select>
                                    </div>
                                </div>`;
                        }
                        
                        addToCartHtml = `
                            ${flavorSelectionHtml}
                            <button class="add-to-cart-btn" data-product-id="${product.id}">
                                <i class="fas fa-plus"></i> Adicionar
                            </button>
                        `;
                    } else {
                        // Produto sem opções de sabor
                        addToCartHtml = `
                            <button class="add-to-cart-btn" data-product-id="${product.id}">
                                <i class="fas fa-plus"></i> Adicionar
                            </button>
                        `;
                    }

                    productElement.innerHTML = `
                        <div class="product-info">
                            <h3 class="product-name">${product.name}</h3>
                            <p class="product-description">${product.description || ''}</p>
                            <p class="product-price">R$ ${product.price.toFixed(2)}</p>
                            ${addToCartHtml}
                        </div>
                    `;

                    // Inserir container de imagem no início do card
                    productElement.insertBefore(imageContainer, productElement.firstChild);

                    // Adicionar eventos aos botões e checkboxes
                    const addButton = productElement.querySelector('.add-to-cart-btn');
                    
                    // Adicionar evento para o botão de selecionar sabores
                    const flavorToggleBtn = productElement.querySelector('.flavor-toggle-btn');
                    if (flavorToggleBtn) {
                        flavorToggleBtn.addEventListener('click', function() {
                            const selectionContainer = this.nextElementSibling;
                            if (selectionContainer.style.display === 'none') {
                                selectionContainer.style.display = 'block';
                                this.textContent = 'Esconder sabores';
                            } else {
                                selectionContainer.style.display = 'none';
                                this.textContent = this.textContent.includes('sabores') ? 'Selecionar sabores' : 'Selecionar sabor';
                            }
                        });
                    }
                    
                    // Se houver checkboxes de sabor, adicionar comportamento de limite de seleção
                    if (product.allowMultipleFlavors) {
                        const checkboxes = productElement.querySelectorAll('.flavor-select-checkbox');
                        const selectionCountText = productElement.querySelector('.flavor-selection-count');
                        const maxSelection = product.flavorQuantity || 1;
                        
                        checkboxes.forEach(checkbox => {
                            checkbox.addEventListener('change', function() {
                                const checked = productElement.querySelectorAll('.flavor-select-checkbox:checked');
                                if (checked.length > maxSelection) {
                                    this.checked = false;
                                    alert(`Você só pode selecionar ${maxSelection} sabores para este produto.`);
                                }
                                
                                // Atualizar o texto de contagem
                                if (selectionCountText) {
                                    const remaining = maxSelection - checked.length;
                                    if (remaining === 0) {
                                        selectionCountText.textContent = 'Seleção completa!';
                                        selectionCountText.style.color = '#28a745'; // Verde
                                    } else {
                                        selectionCountText.textContent = `Selecione mais ${remaining} ${remaining === 1 ? 'sabor' : 'sabores'}`;
                                        selectionCountText.style.color = ''; // Cor padrão
                                    }
                                }
                            });
                        });
                    }
                    
                    addButton.addEventListener('click', function() {
                        let selectedFlavor = null;
                        
                        // Se o produto tem sabores, obter o sabor selecionado
                        if (hasFlavors) {
                            if (product.allowMultipleFlavors === true) {
                                // Obter sabores selecionados nos checkboxes
                                const checkboxes = productElement.querySelectorAll('.flavor-select-checkbox:checked');
                                if (checkboxes.length > 0) {
                                    const selectedFlavors = [];
                                    checkboxes.forEach(checkbox => {
                                        const flavorIndex = parseInt(checkbox.getAttribute('data-index'));
                                        selectedFlavors.push(product.flavors[flavorIndex]);
                                    });
                                    selectedFlavor = selectedFlavors;
                                } else {
                                    alert('Por favor, selecione os sabores desejados.');
                                    return;
                                }
                            } else {
                                // Para seleção única (dropdown)
                                const flavorSelect = productElement.querySelector('.flavor-select');
                                if (flavorSelect) {
                                    const flavorIndex = parseInt(flavorSelect.value);
                                    selectedFlavor = product.flavors[flavorIndex];
                                }
                            }
                        }
                        
                        // Adicionar ao carrinho com informações de sabor
                        addToCartWithFlavor(product.id, selectedFlavor);
                        
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

    // Renderiza o carrinho
    function renderCart() {
        console.log('Renderizando carrinho:', cartManager.getCart());
        const cart = cartManager.getCart();
        const cartContainer = document.getElementById('cart-items');
        
        if (!cartContainer) {
            console.warn('Elemento cart-items não encontrado no DOM');
            return;
        }
        
        // Limpar o conteúdo atual
        cartContainer.innerHTML = '';
        
        // Ocultar a mensagem de carrinho vazio se existir
        const emptyCartMessage = document.getElementById('empty-cart-message');
        if (emptyCartMessage) {
            emptyCartMessage.style.display = cart.length === 0 ? 'block' : 'none';
        }
        
        // Container para itens do carrinho
        const cartItemsContainer = document.createElement('div');
        cartItemsContainer.className = 'cart-items-list';
        
        // Verificar se o carrinho está vazio
        if (cart.length === 0) {
            // Não precisamos fazer nada aqui, a mensagem empty-cart-message já deve estar visível
            // Garantir que o total seja zerado
            updateCartTotal(0);
        } else {
            let total = 0;
            
            // Criar elementos para cada item do carrinho
            cart.forEach((item, index) => {
                const cartItem = document.createElement('div');
                cartItem.className = 'cart-item';
                
                // Título do produto
                const itemTitle = document.createElement('h4');
                itemTitle.className = 'cart-item-title';
                itemTitle.textContent = item.title || 'Produto';
                cartItem.appendChild(itemTitle);
                
                // Container para informações do produto
                const itemInfo = document.createElement('div');
                itemInfo.className = 'cart-item-details';
                cartItem.appendChild(itemInfo);
                
                // Preço unitário
                const unitPriceText = document.createElement('p');
                unitPriceText.className = 'cart-item-unit-price';
                try {
                    const unitPrice = parseFloat(item.price) || 0;
                    unitPriceText.textContent = `Valor unitário: R$ ${unitPrice.toFixed(2)}`;
                    itemInfo.appendChild(unitPriceText);
                } catch (e) {
                    console.error('Erro ao exibir preço unitário:', e);
                }
                
                // Quantidade
                const quantityText = document.createElement('p');
                quantityText.className = 'cart-item-quantity-text';
                quantityText.textContent = `Quantidade: ${item.quantity}`;
                itemInfo.appendChild(quantityText);
                
                // Exibir sabores selecionados, se houver
                if (item.selectedFlavors && item.selectedFlavors.length > 0) {
                    const flavorsText = document.createElement('p');
                    flavorsText.className = 'cart-item-flavors';
                    
                    // Verificar se cada sabor tem a propriedade name
                    const flavorNames = item.selectedFlavors
                        .filter(f => f && f.name)
                        .map(f => f.name)
                        .join(', ');
                    
                    if (flavorNames) {
                        flavorsText.textContent = `Sabores: ${flavorNames}`;
                        itemInfo.appendChild(flavorsText);
                    }
                }
                
                // Preço do item
                const itemPrice = document.createElement('p');
                itemPrice.className = 'cart-item-price';
                
                // Calcular preço total (base + extras dos sabores)
                let basePrice = 0;
                try {
                    basePrice = parseFloat(item.price) || 0;
                } catch (e) {
                    console.error('Erro ao converter preço do item:', e);
                    basePrice = 0;
                }
                
                let itemTotalPrice = basePrice * item.quantity;
                console.log(`Item ${item.title}: Preço base = ${basePrice}, Quantidade = ${item.quantity}`);
                
                // Adicionar preços extras dos sabores
                if (item.selectedFlavors && item.selectedFlavors.length > 0) {
                    item.selectedFlavors.forEach(flavor => {
                        if (flavor && flavor.extraPrice) {
                            try {
                                // Garantir que extraPrice seja um número
                                const extraPrice = parseFloat(flavor.extraPrice) || 0;
                                itemTotalPrice += extraPrice * item.quantity;
                                console.log(`  Sabor ${flavor.name}: Preço extra = ${extraPrice}`);
                            } catch (e) {
                                console.error('Erro ao converter preço extra do sabor:', e);
                            }
                        }
                    });
                }
                
                itemPrice.textContent = `Total: R$ ${itemTotalPrice.toFixed(2)}`;
                itemInfo.appendChild(itemPrice);
                
                // Controles de quantidade
                const quantityControls = document.createElement('div');
                quantityControls.className = 'quantity-controls';
                
                const decreaseBtn = document.createElement('button');
                decreaseBtn.textContent = '-';
                decreaseBtn.addEventListener('click', () => {
                    if (item.quantity > 1) {
                        item.quantity--;
                        cartManager.decreaseQuantity(item.productId, item.selectedFlavors || []);
                        renderCart();
                        updateCartBadge();
                    }
                });
                
                const quantityDisplay = document.createElement('span');
                quantityDisplay.className = 'cart-item-quantity';
                quantityDisplay.textContent = item.quantity;
                
                const increaseBtn = document.createElement('button');
                increaseBtn.textContent = '+';
                increaseBtn.addEventListener('click', () => {
                    item.quantity++;
                    cartManager.increaseQuantity(item.productId, item.selectedFlavors || []);
                    renderCart();
                    updateCartBadge();
                });
                
                quantityControls.appendChild(decreaseBtn);
                quantityControls.appendChild(quantityDisplay);
                quantityControls.appendChild(increaseBtn);
                cartItem.appendChild(quantityControls);
                
                // Botão remover
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-item';
                removeBtn.textContent = 'Remover';
                removeBtn.addEventListener('click', () => {
                    if (confirm('Tem certeza que deseja remover este item?')) {
                        cartManager.removeFromCart(item.productId, item.selectedFlavors || []);
                        renderCart();
                        updateCartBadge();
                    }
                });
                cartItem.appendChild(removeBtn);
                
                cartItemsContainer.appendChild(cartItem);
                
                // Adicionar ao total
                total += itemTotalPrice;
                console.log(`Total parcial após item ${index + 1}: R$ ${total.toFixed(2)}`);
            });
            
            cartContainer.appendChild(cartItemsContainer);
            
            // Atualizar o total
            updateCartTotal(total);
        }
    }

    // Função para atualizar o total do carrinho
    function updateCartTotal(total) {
        const cartTotalElement = document.getElementById('cartTotal');
        if (!cartTotalElement) {
            console.warn('Elemento cartTotal não encontrado no DOM');
            return;
        }
        
        // Garantir que o total seja um número válido
        if (isNaN(total) || total === null || total === undefined) {
            console.warn('Total inválido:', total);
            total = 0;
        }
        
        // Formatar o total com duas casas decimais
        try {
            cartTotalElement.textContent = `R$ ${parseFloat(total).toFixed(2)}`;
        } catch (e) {
            console.error('Erro ao formatar o total:', e);
            cartTotalElement.textContent = 'R$ 0,00';
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

    // Prepara e envia o pedido para o WhatsApp
    async function sendWhatsAppOrder() {
        try {
            if (!navigator.onLine) {
                showNotification('Você está offline. Conecte-se à internet para finalizar o pedido.', 'error');
                return;
            }

            const cart = await getCartItems();
            if (cart.length === 0) {
                showNotification('Adicione produtos ao carrinho primeiro!', 'error');
                return;
            }

            // Pega informações do cliente
            const name = document.getElementById('clientName').value.trim();
            const address = document.getElementById('clientAddress').value.trim();

            if (!name || !address) {
                showNotification('Preencha seu nome e endereço para continuar', 'error');
                return;
            }

            let totalPrice = 0;
            // Constrói a mensagem para WhatsApp
            let message = `*Novo Pedido*\n\n*Cliente:* ${name}\n*Endereço:* ${address}\n\n*Produtos:*\n`;

            cart.forEach(item => {
                let itemPrice = parseFloat(item.price || 0);
                
                // Adicionar texto dos sabores e preços extras
                let flavorText = '';
                if (item.selectedFlavors && item.selectedFlavors.length > 0) {
                    const flavorNames = item.selectedFlavors.map(f => f.name).join(', ');
                    flavorText = `\n   - Sabores: ${flavorNames}`;
                    
                    // Calcular preço extra dos sabores
                    item.selectedFlavors.forEach(flavor => {
                        if (flavor.extraPrice) {
                            const extraPrice = parseFloat(flavor.extraPrice) || 0;
                            itemPrice += extraPrice;
                        }
                    });
                } else if (item.flavor && item.flavor.name) {
                    flavorText = `\n   - Sabor: ${item.flavor.name}`;
                    
                    // Adicionar preço extra do sabor
                    if (item.flavor.extraPrice) {
                        const extraPrice = parseFloat(item.flavor.extraPrice) || 0;
                        itemPrice += extraPrice;
                    }
                }
                
                const itemTotal = itemPrice * item.quantity;
                totalPrice += itemTotal;
                
                message += `\n• ${item.quantity}x ${item.title || item.name} - R$ ${itemTotal.toFixed(2)}${flavorText}`;
            });

            message += `\n\n*Total:* R$ ${totalPrice.toFixed(2)}`;

            // Pega número de WhatsApp da configuração
            let whatsappNumber = appConfig.whatsappNumber || "5511999999999";
            if (whatsappNumber.startsWith("+")) {
                whatsappNumber = whatsappNumber.substring(1);
            }
            if (!whatsappNumber.startsWith("55")) {
                whatsappNumber = "55" + whatsappNumber;
            }

            // Adiciona forma de pagamento se disponível
            const paymentMethod = document.getElementById('paymentMethod');
            if (paymentMethod && paymentMethod.value) {
                message += `\n\n*Forma de Pagamento:* ${paymentMethod.value}`;
            }

            // Codifica a mensagem para URL
            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

            // Limpa o carrinho se confirmado
            if (confirm('Você será redirecionado para o WhatsApp para finalizar seu pedido. Continuar?')) {
                cartManager.clearCart();
                renderCart();
                updateCartBadge();
                window.open(whatsappUrl, '_blank');
            }
        } catch (error) {
            console.error('Erro ao enviar pedido:', error);
            showNotification('Ocorreu um erro ao processar seu pedido', 'error');
        }
    }

    // Função para obter itens do carrinho com detalhes
    async function getCartItems() {
        const allProducts = await productManager.getProducts();
        return appData.cart.map(item => {
            const product = allProducts.find(prod => prod.id === item.productId);
            if (product) {
                return {
                    ...product,
                    quantity: item.quantity,
                    selectedFlavors: item.selectedFlavors || [],  // Formato padronizado para sabores
                    flavor: item.flavor || null,   // Compatibilidade com formato antigo
                    hasFlavors: product.hasFlavors || false,
                    allowMultipleFlavors: product.allowMultipleFlavors || false,
                    flavorQuantity: product.flavorQuantity || 1
                };
            }
            return null;
        }).filter(item => item !== null);
    }

    // Expor funções globalmente
    window.cardapioApp = {
        renderCart,
        updateCartBadge
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

    // Adicionar listeners para mudanças no tipo de entrega e endereço
    document.addEventListener('DOMContentLoaded', function() {
        const deliveryTypeInputs = document.querySelectorAll('input[name="delivery-type"]');
        const addressInput = document.getElementById('customer-address');
        const deliveryAddressContainer = document.getElementById('delivery-address-container');
        const deliveryFeeInfo = document.getElementById('delivery-fee-info');
        const deliveryFeeElement = document.getElementById('delivery-fee');
        const orderSubtotalElement = document.getElementById('order-subtotal');
        const orderTotalElement = document.getElementById('order-total');
        const checkoutButton = document.querySelector('.submit-btn');

        // Função para atualizar a visibilidade do container de endereço
        function updateDeliveryContainer() {
            const deliveryType = document.querySelector('input[name="delivery-type"]:checked')?.value;
            const addressContainer = document.getElementById('delivery-address-container');
            const deliveryFeeInfo = document.getElementById('delivery-fee-info');
            
            console.log('Tipo de entrega selecionado:', deliveryType);
            console.log('Container de endereço encontrado:', !!addressContainer);

            if (!addressContainer) {
                console.error('Container de endereço não encontrado');
                return;
            }

            if (deliveryType === 'pickup') {
                addressContainer.style.display = 'none';
                document.getElementById('customer-address').value = '';
                if (deliveryFeeInfo) {
                    deliveryFeeInfo.innerHTML = '<p class="fee-info" style="color: #28a745;"><i class="fas fa-store"></i> Retirada gratuita na loja</p>';
                }
                window.currentDelivery = {
                    fee: 0,
                    distance: 0,
                    type: 'pickup'
                };
                updateTotal();
            } else {
                addressContainer.style.display = 'block';
                calculateDeliveryFee();
            }
        }
        
        // Função para atualizar o total quando o modo pickup é selecionado
        function updateTotal() {
            const orderSubtotalElement = document.getElementById('order-subtotal');
            const deliveryFeeElement = document.getElementById('delivery-fee');
            const orderTotalElement = document.getElementById('order-total');
            const checkoutButton = document.querySelector('.submit-btn');
            
            if (deliveryFeeElement) {
                deliveryFeeElement.textContent = 'R$ 0,00';
            }
            
            if (orderSubtotalElement && orderTotalElement) {
                const subtotal = parseFloat(orderSubtotalElement.textContent.replace(/[^\d,\.]/g, '').replace(',', '.')) || 0;
                orderTotalElement.textContent = `R$ ${subtotal.toFixed(2)}`;
            }
            
            // Habilitar botão de checkout
            if (checkoutButton) {
                checkoutButton.disabled = false;
            }
        }

        if (deliveryTypeInputs) {
            deliveryTypeInputs.forEach(input => {
                input.addEventListener('change', updateDeliveryContainer);
            });
        }

        if (addressInput) {
            if (/Mobi|Android/i.test(navigator.userAgent)) {
                addressInput.addEventListener('input', calculateDeliveryFee);
            } else {
                addressInput.addEventListener('input', debounce(calculateDeliveryFee, 500));
            }
            addressInput.addEventListener('blur', calculateDeliveryFee);
        }

        // Verificar estado inicial
        const initialDeliveryType = document.querySelector('input[name="delivery-type"]:checked');
        if (initialDeliveryType) {
            updateDeliveryContainer();
        }
    });

    // Função para calcular taxa de entrega
    async function calculateDeliveryFee() {
        // Declarar variáveis fora do try para estarem acessíveis no catch
        const addressInput = document.getElementById('customer-address');
        const deliveryFeeInfo = document.getElementById('delivery-fee-info');
        const deliveryFeeElement = document.getElementById('delivery-fee');
        const orderSubtotalElement = document.getElementById('order-subtotal');
        const orderTotalElement = document.getElementById('order-total');
        const checkoutButton = document.querySelector('.submit-btn');
        const deliveryAddressContainer = document.getElementById('delivery-address-container'); // Mantido para referência, mas não para estilo
        const deliveryType = document.querySelector('input[name="delivery-type"]:checked')?.value || 'delivery';

        try {
            // Verificar se o campo de endereço está preenchido (necessário para cálculo)
            if (!addressInput || !addressInput.value.trim()) {
                if (deliveryFeeInfo) {
                    deliveryFeeInfo.style.display = 'block';
                    deliveryFeeInfo.innerHTML = '<p class="fee-info">Digite seu endereço para calcular a taxa de entrega</p>';
                }
                if (deliveryFeeElement) {
                    deliveryFeeElement.textContent = 'R$ 0,00';
                }
                if (checkoutButton) {
                    checkoutButton.disabled = true;
                }
                window.currentDelivery = null; // Resetar info de entrega
                return;
            }

            // Mostrar indicador de carregamento
            if (deliveryFeeInfo) {
                deliveryFeeInfo.style.display = 'block';
                deliveryFeeInfo.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Calculando taxa de entrega...</p>';
            }
            if (checkoutButton) {
                checkoutButton.disabled = true;
            }

            // Obter o total do pedido
            let cartTotal = 0;
            if (orderSubtotalElement) {
                cartTotal = parseFloat(orderSubtotalElement.textContent.replace(/[^\d,\.]/g, '').replace(',', '.')) || 0;
            }

            console.log('Iniciando cálculo de taxa para:', addressInput.value);

            // Calcular taxa de entrega usando deliveryManager
            const result = await window.deliveryManager.calculateDeliveryFee(addressInput.value, cartTotal);

            console.log('Resultado do cálculo (app.js):', result);

            // Atualizar informações
            if (deliveryFeeElement) {
                deliveryFeeElement.textContent = `R$ ${result.fee.toFixed(2)}`;
            }
            
            // Atualizar total com entrega
            if (orderTotalElement) {
                const totalWithDelivery = cartTotal + result.fee;
                orderTotalElement.textContent = `R$ ${totalWithDelivery.toFixed(2)}`;
            }

            // Mostrar informações da entrega
            if (deliveryFeeInfo) {
                deliveryFeeInfo.innerHTML = `
                    <p class="distance-info">Distância: ${result.distance.toFixed(1)}km</p>
                    <p class="fee-info">${result.message || `Taxa de entrega: R$ ${result.fee.toFixed(2)}`}</p>
                `;
            }

            // Habilitar botão de checkout
            if (checkoutButton) {
                checkoutButton.disabled = false;
            }

            // Armazenar informações para uso posterior
            window.currentDelivery = {
                type: 'delivery',
                address: addressInput.value,
                fee: result.fee,
                distance: result.distance
            };

        } catch (error) {
            console.error('Erro ao calcular taxa de entrega (app.js):', error);
            // Usar as variáveis declaradas fora do try
            if (deliveryFeeInfo) {
                deliveryFeeInfo.style.display = 'block';
                deliveryFeeInfo.innerHTML = `
                    <p class="error-message" style="color: var(--danger-color);">
                        <i class="fas fa-exclamation-circle"></i> ${error.message || 'Erro ao calcular taxa.'}
                    </p>
                `;
            }
            
            if (deliveryFeeElement) {
                deliveryFeeElement.textContent = 'R$ --'; // Indicar erro
            }
            
            if (checkoutButton) {
                checkoutButton.disabled = true;
            }
            
            window.currentDelivery = null; // Resetar info de entrega em caso de erro
        }
    }

    // Função de debounce para evitar muitas chamadas
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Função auxiliar para obter um produto pelo ID
    async function getProductDetails(productId) {
        try {
            // Primeiro tenta buscar no DOM (se estiver visível na página atual)
            const productElement = document.querySelector(`.product-card [data-product-id="${productId}"]`);
            if (productElement) {
                const productCard = productElement.closest('.product-card');
                const productName = productCard.querySelector('.product-name').textContent;
                const productPriceText = productCard.querySelector('.product-price').textContent.trim();
                const productPrice = parseFloat(productPriceText.replace('R$', '').replace(',', '.').trim()) || 0;
                
                console.log(`Produto encontrado no DOM: ${productName}, Preço: R$ ${productPrice}`);
                return {
                    id: productId,
                    title: productName,
                    price: productPrice
                };
            }
            
            // Se não encontrou no DOM, busca no Firebase
            console.log(`Produto não encontrado no DOM, buscando no Firebase: ${productId}`);
            const snapshot = await window.appFirebase.productsRef.doc(productId).get();
            if (snapshot.exists) {
                const product = snapshot.data();
                return {
                    id: productId,
                    title: product.name,
                    price: parseFloat(product.price) || 0
                };
            }
            
            // Se não encontrou, retorna um objeto básico
            console.warn(`Produto não encontrado: ${productId}`);
            return {
                id: productId,
                title: 'Produto',
                price: 0
            };
        } catch (error) {
            console.error('Erro ao buscar detalhes do produto:', error);
            return {
                id: productId,
                title: 'Produto',
                price: 0
            };
        }
    }
});
