// Integração com WhatsApp
function sendWhatsAppMessage(cartItems, total) {
    const phoneNumber = "5585996226262"; // Número do WhatsApp
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

// Disponibilizar função globalmente
window.whatsappIntegration = {
    sendWhatsAppMessage,
    addQuickOrderButtons
};