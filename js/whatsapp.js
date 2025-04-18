// Funções para integração com WhatsApp
document.addEventListener('DOMContentLoaded', function() {
    // Número de WhatsApp da Mapeju
    const WHATSAPP_NUMBER = '556294535053';
    
    // Função para gerar mensagem de pedido para WhatsApp
    function generateOrderMessage() {
        if (appData.cart.length === 0) return '';
        
        let message = '🛒 *Novo Pedido - Mapeju Doces* 🛒\n\n';
        message += '*Itens do Pedido:*\n';
        
        appData.cart.forEach(item => {
            const product = appData.products.find(prod => prod.id === item.productId);
            if (product) {
                message += `• ${item.quantity}x ${product.name} - R$ ${(product.price * item.quantity).toFixed(2)}\n`;
            }
        });
        
        message += `\n*Total: R$ ${getCartTotal().toFixed(2)}*\n\n`;
        message += 'Por favor, confirme meu pedido com os dados para entrega. Obrigado!';
        
        return encodeURIComponent(message);
    }
    
    // Função para enviar pedido via WhatsApp
    function sendOrderToWhatsApp() {
        if (appData.cart.length === 0) {
            alert('Seu carrinho está vazio. Adicione produtos antes de fazer o pedido.');
            return false;
        }
        
        const message = generateOrderMessage();
        const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
        
        // Abrir WhatsApp em nova janela
        window.open(whatsappUrl, '_blank');
        
        // Mostrar confirmação
        showOrderConfirmation();
        
        return true;
    }
    
    // Função para mostrar confirmação de pedido
    function showOrderConfirmation() {
        // Criar elemento de confirmação
        const confirmationDiv = document.createElement('div');
        confirmationDiv.className = 'order-confirmation';
        confirmationDiv.innerHTML = `
            <p><i class="fas fa-check-circle"></i> Seu pedido foi enviado para o WhatsApp!</p>
            <p>Aguarde a confirmação da Mapeju Doces.</p>
        `;
        
        // Adicionar ao carrinho
        const cartElement = document.querySelector('.cart');
        if (cartElement) {
            cartElement.appendChild(confirmationDiv);
            
            // Remover após 5 segundos
            setTimeout(() => {
                if (confirmationDiv.parentNode) {
                    confirmationDiv.parentNode.removeChild(confirmationDiv);
                }
            }, 5000);
        }
    }
    
    // Função para adicionar botão de pedido rápido nos produtos
    function addQuickOrderButtons() {
        const productCards = document.querySelectorAll('.product-card');
        
        productCards.forEach(card => {
            // Verificar se já existe um botão de pedido rápido
            if (card.querySelector('.quick-order-btn')) return;
            
            const productId = card.querySelector('.add-to-cart-btn').getAttribute('data-id');
            const productInfo = card.querySelector('.product-info');
            
            const quickOrderBtn = document.createElement('button');
            quickOrderBtn.className = 'quick-order-btn';
            quickOrderBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Pedir Agora';
            quickOrderBtn.setAttribute('data-id', productId);
            
            quickOrderBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const productId = parseInt(this.getAttribute('data-id'));
                const product = appData.products.find(p => p.id === productId);
                
                if (product) {
                    // Limpar carrinho atual
                    clearCart();
                    
                    // Adicionar apenas este produto
                    addToCart(productId);
                    
                    // Enviar pedido
                    sendOrderToWhatsApp();
                }
            });
            
            productInfo.appendChild(quickOrderBtn);
        });
    }
    
    // Adicionar botão de compartilhar cardápio
    function addShareMenuButton() {
        const header = document.querySelector('header');
        
        if (header) {
            const shareBtn = document.createElement('button');
            shareBtn.className = 'share-menu-btn';
            shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> Compartilhar Cardápio';
            
            shareBtn.addEventListener('click', function() {
                shareMenu();
            });
            
            // Criar container para o botão
            const shareBtnContainer = document.createElement('div');
            shareBtnContainer.className = 'share-button';
            shareBtnContainer.appendChild(shareBtn);
            
            header.appendChild(shareBtnContainer);
        }
    }
    
    // Função para compartilhar o cardápio
    function shareMenu() {
        // Texto para compartilhamento
        const shareText = encodeURIComponent('Confira o cardápio digital da Mapeju Doces! Delícias artesanais a um clique de distância.');
        
        // URL atual (em um ambiente real, seria a URL pública do cardápio)
        const shareUrl = encodeURIComponent(window.location.href);
        
        // Criar modal de compartilhamento
        const shareModal = document.createElement('div');
        shareModal.className = 'modal';
        shareModal.style.display = 'block';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content share-modal';
        
        modalContent.innerHTML = `
            <span class="close">&times;</span>
            <h3>Compartilhar Cardápio</h3>
            <div class="share-options">
                <a href="https://wa.me/?text=${shareText}%20${shareUrl}" target="_blank" class="share-option whatsapp">
                    <i class="fab fa-whatsapp"></i>
                    <span>WhatsApp</span>
                </a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" class="share-option facebook">
                    <i class="fab fa-facebook"></i>
                    <span>Facebook</span>
                </a>
                <a href="https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}" target="_blank" class="share-option twitter">
                    <i class="fab fa-twitter"></i>
                    <span>Twitter</span>
                </a>
                <a href="mailto:?subject=Cardápio Mapeju Doces&body=${shareText}%20${shareUrl}" class="share-option email">
                    <i class="fas fa-envelope"></i>
                    <span>Email</span>
                </a>
            </div>
        `;
        
        shareModal.appendChild(modalContent);
        document.body.appendChild(shareModal);
        
        // Fechar modal
        const closeBtn = modalContent.querySelector('.close');
        closeBtn.addEventListener('click', function() {
            document.body.removeChild(shareModal);
        });
        
        // Fechar modal ao clicar fora dele
        shareModal.addEventListener('click', function(event) {
            if (event.target === shareModal) {
                document.body.removeChild(shareModal);
            }
        });
    }
    
    // Adicionar botão de contato direto
    function addContactButton() {
        const footer = document.querySelector('footer');
        
        if (footer) {
            const contactBtn = document.createElement('button');
            contactBtn.className = 'contact-btn';
            contactBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Fale Conosco';
            
            contactBtn.addEventListener('click', function() {
                const message = encodeURIComponent('Olá! Gostaria de mais informações sobre os produtos da Mapeju Doces.');
                window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
            });
            
            footer.appendChild(contactBtn);
        }
    }
    
    // Expor funções globalmente
    window.whatsappIntegration = {
        sendOrderToWhatsApp,
        showOrderConfirmation,
        addQuickOrderButtons,
        addShareMenuButton,
        addContactButton
    };
    
    // Inicializar funcionalidades de WhatsApp
    function initWhatsAppIntegration() {
        // Substituir função de pedido no app.js
        const orderBtn = document.getElementById('order-btn');
        if (orderBtn) {
            // Remover event listeners anteriores
            const newOrderBtn = orderBtn.cloneNode(true);
            orderBtn.parentNode.replaceChild(newOrderBtn, orderBtn);
            
            // Adicionar novo event listener
            newOrderBtn.addEventListener('click', function() {
                sendOrderToWhatsApp();
            });
        }
        
        // Adicionar botões de pedido rápido
        setTimeout(addQuickOrderButtons, 1000); // Atraso para garantir que os produtos foram carregados
        
        // Adicionar botão de compartilhar
        addShareMenuButton();
        
        // Adicionar botão de contato
        addContactButton();
    }
    
    // Inicializar quando o DOM estiver pronto
    initWhatsAppIntegration();
});
