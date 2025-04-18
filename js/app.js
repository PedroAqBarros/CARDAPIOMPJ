// Aplicação principal do cardápio digital
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

    // Inicializar a aplicação
    initApp();

    function initApp() {
        // Renderizar categorias
        renderCategories();
        
        // Configurar eventos
        setupEventListeners();
        
        // Renderizar carrinho
        renderCart();
        
        // Atualizar badge do carrinho
        updateCartBadge();
        
        // Se houver categorias, selecionar a primeira por padrão
        if (appData.categories.length > 0) {
            selectCategory(appData.categories[0].id);
        }
    }

    function setupEventListeners() {
        // Botão para limpar carrinho
        clearCartBtn.addEventListener('click', function() {
            if (confirm('Tem certeza que deseja limpar o carrinho?')) {
                clearCart();
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
            
            const message = generateOrderMessage();
            const whatsappUrl = `https://wa.me/556294535053?text=${message}`;
            window.open(whatsappUrl, '_blank');
            
            // Mostrar confirmação
            showOrderConfirmation();
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
            cartElement.removeChild(confirmationDiv);
        }, 5000);
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

    // Renderizar categorias
    function renderCategories() {
        categoriesContainer.innerHTML = '';
        
        if (appData.categories.length === 0) {
            categoriesContainer.innerHTML = '<p class="empty-message">Nenhuma categoria disponível</p>';
            return;
        }
        
        appData.categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'category-btn';
            button.setAttribute('data-id', category.id);
            button.textContent = category.name;
            
            button.addEventListener('click', function() {
                // Remover classe active de todos os botões
                document.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Adicionar classe active ao botão clicado
                this.classList.add('active');
                
                // Renderizar produtos da categoria
                selectCategory(category.id);
            });
            
            categoriesContainer.appendChild(button);
        });
    }

    // Selecionar categoria e mostrar seus produtos
    function selectCategory(categoryId) {
        // Ativar botão da categoria
        const categoryButtons = document.querySelectorAll('.category-btn');
        categoryButtons.forEach(btn => {
            if (parseInt(btn.getAttribute('data-id')) === categoryId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Renderizar produtos da categoria
        renderProductsByCategory(categoryId);
    }

    // Renderizar produtos por categoria
    function renderProductsByCategory(categoryId) {
        productsContainer.innerHTML = '';
        
        const productsInCategory = appData.products.filter(product => product.categoryId === categoryId);
        
        if (productsInCategory.length === 0) {
            productsContainer.innerHTML = '<div class="empty-message">Nenhum produto disponível nesta categoria</div>';
            return;
        }
        
        productsInCategory.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            
            // Verificar se a imagem existe
            const imageUrl = product.image || 'img/default-product.jpg';
            
            let imageHtml = '';
            if (imageUrl) {
                imageHtml = `<img src="${imageUrl}" alt="${product.name}" class="product-image" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'product-image-placeholder\\'><i class=\\'fas fa-cookie\\'></i></div>'">`;
            } else {
                imageHtml = `<div class="product-image-placeholder"><i class="fas fa-cookie"></i></div>`;
            }
            
            productCard.innerHTML = `
                ${imageHtml}
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    <p class="product-price">R$ ${product.price.toFixed(2)}</p>
                    <button class="add-to-cart-btn" data-id="${product.id}">
                        <i class="fas fa-cart-plus"></i> Adicionar
                    </button>
                </div>
            `;
            
            // Adicionar evento ao botão de adicionar ao carrinho
            const addToCartBtn = productCard.querySelector('.add-to-cart-btn');
            addToCartBtn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                addToCart(productId);
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
    }

    // Renderizar carrinho
    function renderCart() {
        // Limpar conteúdo atual
        cartItemsContainer.innerHTML = '';
        
        // Verificar se o carrinho está vazio
        if (appData.cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <p>Seu carrinho está vazio</p>
                </div>
            `;
            cartTotalValue.textContent = 'R$ 0,00';
            return;
        }
        
        // Renderizar itens do carrinho
        appData.cart.forEach(item => {
            const product = appData.products.find(prod => prod.id === item.productId);
            if (!product) return;
            
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-name">${product.name}</div>
                    <div class="cart-item-price">R$ ${product.price.toFixed(2)} cada</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn decrease-btn" data-id="${product.id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn increase-btn" data-id="${product.id}">+</button>
                    <button class="remove-item-btn" data-id="${product.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            // Adicionar eventos aos botões
            const decreaseBtn = cartItem.querySelector('.decrease-btn');
            decreaseBtn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                const cartItem = appData.cart.find(item => item.productId === productId);
                if (cartItem && cartItem.quantity > 1) {
                    updateCartItemQuantity(productId, cartItem.quantity - 1);
                } else {
                    removeFromCart(productId);
                }
                renderCart();
                updateCartBadge();
            });
            
            const increaseBtn = cartItem.querySelector('.increase-btn');
            increaseBtn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                const cartItem = appData.cart.find(item => item.productId === productId);
                if (cartItem) {
                    updateCartItemQuantity(productId, cartItem.quantity + 1);
                    renderCart();
                    updateCartBadge();
                }
            });
            
            const removeBtn = cartItem.querySelector('.remove-item-btn');
            removeBtn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                removeFromCart(productId);
                renderCart();
                updateCartBadge();
            });
            
            cartItemsContainer.appendChild(cartItem);
        });
        
        // Atualizar total
        cartTotalValue.textContent = `R$ ${getCartTotal().toFixed(2)}`;
    }
});
