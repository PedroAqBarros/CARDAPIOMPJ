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

    // Gerenciador de configurações
    const configManager = {
        configs: {},
        
        init: async function() {
            try {
                const configRef = db.collection('configs');
                const snapshot = await configRef.get();
                snapshot.forEach(doc => {
                    this.configs[doc.id] = doc.data().value;
                });
                console.log('Configurações carregadas:', this.configs);
            } catch (error) {
                console.error('Erro ao carregar configurações:', error);
            }
        },
        
        getConfig: function(key) {
            return this.configs[key] || null;
        },
        
        setConfig: function(key, value) {
            this.configs[key] = value;
        }
    };

    // Variáveis para controle de estado
    let selectedCategoryId = null;
    let categoriesListener = null;
    let productsListener = null;
    
    // Dados da aplicação
    const appData = {
        cart: []
    };

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
        },
        
        getCartTotal: function() {
            let total = 0;
            this.getCart().forEach(item => {
                total += item.price * item.quantity;
            });
            return total;
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
    async function initApp() {
        try {
            console.log('Inicializando aplicação...');
            
            // Inicializar configurações
            await configManager.init();
            
            // Inicializar o carrinho do localStorage
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

    // Configuração dos eventos de botões
    function setupEventListeners() {
        try {
            // Botão flutuante do carrinho
            if (floatingCartBtn) {
                console.log('Configurando botão flutuante do carrinho');
                floatingCartBtn.addEventListener('click', function() {
                    if (cartElement) {
                        cartElement.classList.add('open');
                }
            });
        }

            // Botão para fechar o carrinho
            if (closeCartBtn) {
                console.log('Configurando botão para fechar o carrinho');
                closeCartBtn.addEventListener('click', function() {
                    if (cartElement) {
                        cartElement.classList.remove('open');
                }
            });
        }

            // Event listener para o botão de finalizar pedido
            const checkoutButton = document.getElementById('checkoutButton');
            if (checkoutButton) {
                console.log('Configurando botão de finalizar pedido');
                checkoutButton.addEventListener('click', function() {
                    console.log('Botão finalizar pedido clicado');
                    const cart = cartManager.getCart();
                    if (cart.length === 0) {
                        showNotification('Adicione produtos ao carrinho primeiro!', 'error');
                        return;
                    }

                    // Mostrar modal de checkout se existir
                    const checkoutModal = document.getElementById('checkout-modal');
                    if (checkoutModal) {
                        console.log('Abrindo modal de checkout');
                        checkoutModal.style.display = 'block';
                        
                        // Atualizar valores de entrega e total
                        updateCheckoutTotals();
                    } else {
                        console.log('Modal não encontrado, enviando direto para WhatsApp');
                        sendWhatsAppOrder();
                    }
                });
            }

            // Configurar botões de fechar modal
            const closeModalButtons = document.querySelectorAll('.close');
            closeModalButtons.forEach(btn => {
                btn.addEventListener('click', function() {
                    console.log('Botão fechar modal clicado');
                    const modal = this.closest('.modal');
                    if (modal) {
                        console.log('Fechando modal');
                        modal.style.display = 'none';
                    }
                });
            });

            // Configurar formulário de checkout
            const checkoutForm = document.getElementById('checkout-form');
            if (checkoutForm) {
                console.log('Configurando formulário de checkout');
                
                // Inicializar comportamento do campo de troco
                handlePaymentMethodChange();
                
                checkoutForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    console.log('Formulário de checkout enviado');
                    sendWhatsAppOrder();
                    
                    // Fechar o modal após envio
                    const checkoutModal = document.getElementById('checkout-modal');
                    if (checkoutModal) {
                        checkoutModal.style.display = 'none';
                    }
                });
            }

            // Configurar comportamento de tipo de entrega
            const deliveryTypeInputs = document.querySelectorAll('input[name="delivery-type"]');
            deliveryTypeInputs.forEach(input => {
                input.addEventListener('change', function() {
                    console.log('Tipo de entrega alterado para:', this.value);
                    const addressContainer = document.getElementById('delivery-address-container');
                    const quadraInput = document.getElementById('quadra');
                    const loteInput = document.getElementById('lote');
                    
                    if (addressContainer) {
                        if (this.value === 'delivery') {
                            addressContainer.style.display = 'block';
                            if (quadraInput) quadraInput.required = true;
                            if (loteInput) loteInput.required = true;
                        } else {
                            addressContainer.style.display = 'none';
                            if (quadraInput) quadraInput.required = false;
                            if (loteInput) loteInput.required = false;
                        }
                    }
                    updateCheckoutTotals();
                });
            });

            // Disparar o evento change no radio button selecionado inicialmente
            const selectedDeliveryType = document.querySelector('input[name="delivery-type"]:checked');
            if (selectedDeliveryType) {
                selectedDeliveryType.dispatchEvent(new Event('change'));
            }

            // Payment method change event
            const paymentMethodSelect = document.getElementById('payment-method');
            if (paymentMethodSelect) {
                paymentMethodSelect.addEventListener('change', handlePaymentMethodChange);
                handlePaymentMethodChange();
            }
        } catch (error) {
            console.error('Erro ao configurar event listeners:', error);
        }
    }

    // Função para atualizar os valores no checkout
    function updateCheckoutTotals() {
        console.log('Atualizando totais do checkout');
        const cartTotal = cartManager.getCartTotal();
        console.log('Total do carrinho:', cartTotal);
        
        // Atualizar subtotal
        const subtotalElement = document.getElementById('order-subtotal');
        if (subtotalElement) {
            subtotalElement.textContent = `R$ ${cartTotal.toFixed(2)}`;
        }
        
        // Obter valor da taxa de entrega
        let deliveryFee = 0;
        const deliveryFeeElement = document.getElementById('delivery-fee');
        
        // Verificar se é entrega
        const deliveryRadio = document.querySelector('input[name="delivery-type"][value="delivery"]');
        const isDelivery = deliveryRadio && deliveryRadio.checked;
        
        if (isDelivery) {
            try {
                deliveryFee = parseFloat(configManager.getConfig('deliveryFee') || '0');
                console.log('Taxa de entrega:', deliveryFee);
            } catch (error) {
                console.warn('Erro ao obter taxa de entrega:', error);
                deliveryFee = 0;
            }
        }
        
        if (deliveryFeeElement) {
            deliveryFeeElement.textContent = `R$ ${deliveryFee.toFixed(2)}`;
        }
        
        // Calcular e atualizar total
        const totalElement = document.getElementById('order-total');
        if (totalElement) {
            const total = cartTotal + (isDelivery ? deliveryFee : 0);
            console.log('Total final:', total);
            totalElement.textContent = `R$ ${total.toFixed(2)}`;
        }
    }

    // Função para lidar com mudança no método de pagamento
    function handlePaymentMethodChange() {
        const paymentSelect = document.getElementById('payment-method');
        const changeAmountContainer = document.getElementById('change-container');
        
        if (paymentSelect && changeAmountContainer) {
            const selectedMethod = paymentSelect.options[paymentSelect.selectedIndex].text;
            
            if (selectedMethod.includes('Dinheiro')) {
                changeAmountContainer.style.display = 'block';
            } else {
                changeAmountContainer.style.display = 'none';
            }
        }
    }

    // Envia o pedido via WhatsApp
    async function sendWhatsAppOrder() {
        console.log('Preparando para enviar pedido por WhatsApp');
        
        // Verificar se o modal de checkout está sendo usado
        const checkoutModal = document.getElementById('checkout-modal');
        
        let customerName = '';
        let customerAddress = '';
        let paymentMethod = '';
        let changeAmount = '';
        let tipoEntrega = '';
        let deliveryFee = 0;
        
        // Se estiver usando o modal de checkout, pegar os dados do formulário
        if (checkoutModal && checkoutModal.style.display === 'block') {
            console.log('Obtendo dados do formulário de checkout');
            
            // Obter valores dos campos
            customerName = document.getElementById('customer-name').value;
            
            // Verificar campos obrigatórios
            if (!customerName) {
                showNotification('Por favor, informe seu nome', 'error');
                return;
            }
            
            // Obter tipo de entrega
            const deliveryOptions = document.getElementsByName('delivery-type');
            for (const option of deliveryOptions) {
                if (option.checked) {
                    tipoEntrega = option.value;
                    break;
                }
            }

            // Se for entrega, validar endereço
            if (tipoEntrega === 'delivery') {
                const quadra = document.getElementById('quadra').value;
                const lote = document.getElementById('lote').value;
                const complemento = document.getElementById('complemento').value || '';
                
                if (!quadra || !lote) {
                    showNotification('Por favor, informe sua quadra e lote', 'error');
                    return;
                }
                
                // Construir endereço
                customerAddress = `Quadra ${quadra}, Lote ${lote}`;
                if (complemento) {
                    customerAddress += `, ${complemento}`;
                }
            }
            
            // Obter método de pagamento
            const paymentSelect = document.getElementById('payment-method');
            if (!paymentSelect.value) {
                showNotification('Por favor, selecione a forma de pagamento', 'error');
                return;
            }
            paymentMethod = paymentSelect.options[paymentSelect.selectedIndex].text;
            
            // Se for pagamento em dinheiro, verificar troco
            if (paymentMethod.includes('Dinheiro')) {
                changeAmount = document.getElementById('change-amount').value;
                if (changeAmount && !isNaN(parseFloat(changeAmount))) {
                    changeAmount = `Troco para R$ ${parseFloat(changeAmount).toFixed(2)}`;
                } else {
                    changeAmount = 'Sem troco';
                }
            }
            
            // Calcular taxa de entrega
            if (tipoEntrega === 'delivery') {
                deliveryFee = parseFloat(document.getElementById('delivery-fee').innerText.replace('R$', '').trim()) || 0;
            }
        }
        
        // Obter itens do carrinho
        const cart = cartManager.getCart();
        let itemsText = '';
        let total = 0;
        
        cart.forEach(item => {
            // Calcular o preço base do item
            let itemBasePrice = parseFloat(item.price) || 0;
            let itemTotalPrice = itemBasePrice * item.quantity;
            
            // Formatar o texto para cada item do carrinho
            let itemText = `${item.quantity}x ${item.title} - R$ ${itemBasePrice.toFixed(2)}/un\n`;
            
            // Adicionar informações sobre sabores selecionados, se houver
            if (item.selectedFlavors && item.selectedFlavors.length > 0) {
                itemText += `   Sabores selecionados:\n`;
                
                // Adicionar cada sabor com seu preço extra, se aplicável
                item.selectedFlavors.forEach((flavor, index) => {
                    itemText += `   - ${flavor.name}`;
                    
                    // Adicionar preço extra ao total do item, se houver
                    if (flavor.extraPrice && parseFloat(flavor.extraPrice) > 0) {
                        const extraPrice = parseFloat(flavor.extraPrice);
                        itemText += ` (+R$ ${extraPrice.toFixed(2)})`;
                        itemTotalPrice += extraPrice * item.quantity;
                    }
                    
                    itemText += '\n';
                });
            }
            
            // Adicionar preço total do item, incluindo extras dos sabores
            itemText += `   Subtotal: R$ ${itemTotalPrice.toFixed(2)}\n\n`;
            
            itemsText += itemText;
            total += itemTotalPrice;
        });
        
        // Adicionar taxa de entrega ao total, se aplicável
        if (tipoEntrega === 'delivery') {
            total += deliveryFee;
            itemsText += `\nTaxa de entrega: R$ ${deliveryFee.toFixed(2)}`;
        }
        
        // Adicionar total
        itemsText += `\nTotal: R$ ${total.toFixed(2)}`;
        
        // Construir a mensagem completa para o WhatsApp
        let message = `*Novo Pedido*\n\n`;
        
        if (customerName) {
            message += `*Nome:* ${customerName}\n`;
        }
        
        if (customerAddress) {
            message += `*Endereço:* ${customerAddress}\n`;
        }
        
        if (paymentMethod) {
            message += `*Pagamento:* ${paymentMethod}\n`;
            if (changeAmount && paymentMethod.includes('Dinheiro')) {
                message += `*Troco:* ${changeAmount}\n`;
            }
        }
        
        if (tipoEntrega) {
            message += `*Tipo de entrega:* ${tipoEntrega === 'delivery' ? 'Entrega' : 'Retirada'}\n`;
        }
        
        message += `\n*Itens do pedido:*\n${itemsText}`;
        
        // Codificar a mensagem para URL
        const encodedMessage = encodeURIComponent(message);
        
        // Obter o número do WhatsApp do arquivo de configuração ou usar o valor padrão
        let phoneNumber;
        try {
            if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WHATSAPP_NUMBER) {
                phoneNumber = APP_CONFIG.WHATSAPP_NUMBER;
            } else {
                // Fallback para o número padrão se o arquivo de configuração não estiver disponível
                phoneNumber = '556294535053';
            }
        } catch (error) {
            console.warn('Erro ao obter número do WhatsApp de config.js. Usando número padrão:', error);
            phoneNumber = '556294535053';
        }
        
        const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        
        console.log('Link WhatsApp gerado:', whatsappLink);
        
        // Fechar o modal se estiver aberto
        if (checkoutModal && checkoutModal.style.display === 'block') {
            checkoutModal.style.display = 'none';
        }
        
        // Limpar o carrinho
        cartManager.clearCart();
        
        // Abrir o WhatsApp
        window.open(whatsappLink, '_blank');
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
        
        // Criar mensagem de carrinho vazio
        const emptyMessage = document.createElement('div');
        emptyMessage.id = 'empty-cart-message';
        emptyMessage.className = 'empty-message';
        emptyMessage.innerHTML = '<p>Seu carrinho está vazio</p>';
        
        // Container para itens do carrinho
        const cartItemsContainer = document.createElement('div');
        cartItemsContainer.className = 'cart-items-list';
        
        // Verificar se o carrinho está vazio
        if (!cart || cart.length === 0) {
            cartContainer.appendChild(emptyMessage);
            updateCartTotal(0);
        } else {
            // Ocultar mensagem de carrinho vazio
            emptyMessage.style.display = 'none';
            
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
                decreaseBtn.className = 'decrease-btn';
                decreaseBtn.addEventListener('click', () => {
                    cartManager.decreaseQuantity(item.productId, item.selectedFlavors || []);
                    renderCart();
                    updateCartBadge();
                });
                
                const quantityDisplay = document.createElement('span');
                quantityDisplay.className = 'cart-item-quantity';
                quantityDisplay.textContent = item.quantity;
                
                const increaseBtn = document.createElement('button');
                increaseBtn.textContent = '+';
                increaseBtn.className = 'increase-btn';
                increaseBtn.addEventListener('click', () => {
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
                    cartManager.removeFromCart(item.productId, item.selectedFlavors || []);
                    renderCart();
                    updateCartBadge();
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
});
