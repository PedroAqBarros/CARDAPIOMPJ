// Integração com WhatsApp
function sendWhatsAppMessage(cartItems, total) {
    const phoneNumber = "5562994535053"; // Número do WhatsApp
    let message = "Novo Pedido:\n\n";
    
    cartItems.forEach(item => {
        message += `${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
    });
    
    message += `\nTotal: R$ ${total.toFixed(2)}`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    // Abrir em nova janela com rel=noopener para evitar problemas CORB
    const newWindow = window.open(whatsappUrl, '_blank');
    if (newWindow) {
        newWindow.opener = null;
    }
}

// Adicionar botões de pedido rápido para produtos
function addQuickOrderButtons() {
    document.querySelectorAll('.product-card').forEach(card => {
        // Implementar no futuro se necessário
    });
}

// Função para formatar o pedido para WhatsApp
function formatOrder(cartItems, customerInfo) {
    let message = '🛒 *Novo Pedido*\n\n';
    
    // Adicionar informações do cliente
    message += '*Dados do Cliente*\n';
    message += `Nome: ${customerInfo.name}\n`;
    message += `Endereço: ${customerInfo.address}\n`;
    message += `Forma de Pagamento: ${formatPaymentMethod(customerInfo.paymentMethod)}`;
    
    if (customerInfo.paymentMethod === 'dinheiro' && customerInfo.changeAmount) {
        message += `\nTroco para: R$ ${customerInfo.changeAmount}`;
    }
    
    message += '\n\n*Itens do Pedido*\n';
    
    // Adicionar itens do carrinho
    let total = 0;
    cartItems.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        message += `▫️ ${item.quantity}x ${item.name} - R$ ${itemTotal.toFixed(2)}\n`;
    });
    
    // Adicionar total
    message += `\n*Total: R$ ${total.toFixed(2)}*`;
    
    return message;
}

// Função para formatar o método de pagamento
function formatPaymentMethod(method) {
    const methods = {
        'pix': 'PIX',
        'dinheiro': 'Dinheiro',
        'cartao': 'Cartão (na entrega)'
    };
    return methods[method] || method;
}

// Função para enviar pedido para WhatsApp
function sendToWhatsApp(cartItems) {
    const modal = document.getElementById('checkout-modal');
    const form = document.getElementById('checkout-form');
    const paymentMethod = document.getElementById('payment-method');
    const changeContainer = document.getElementById('change-container');
    const closeBtn = modal.querySelector('.close');
    
    // Mostrar/ocultar campo de troco
    paymentMethod.addEventListener('change', function() {
        changeContainer.style.display = this.value === 'dinheiro' ? 'block' : 'none';
    });
    
    // Fechar modal
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };
    
    // Fechar modal ao clicar fora
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
    
    // Processar formulário
    form.onsubmit = function(e) {
        e.preventDefault();
        
        const customerInfo = {
            name: document.getElementById('customer-name').value,
            address: document.getElementById('customer-address').value,
            paymentMethod: paymentMethod.value,
            changeAmount: document.getElementById('change-amount').value
        };
        
        const message = formatOrder(cartItems, customerInfo);
        const encodedMessage = encodeURIComponent(message);
        const whatsappNumber = '5562994535053'; // Substitua pelo número correto
        
        // Fechar modal
        modal.style.display = 'none';
        
        // Limpar formulário
        form.reset();
        
        // Abrir WhatsApp
        window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
    };
    
    // Mostrar modal
    modal.style.display = 'block';
}

// Disponibilizar função globalmente
window.whatsappIntegration = {
    sendWhatsAppMessage,
    addQuickOrderButtons,
    sendToWhatsApp
};