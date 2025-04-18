export function sendWhatsAppMessage(cartItems, total) {
    const phoneNumber = "5585996226262"; // Replace with your WhatsApp number
    let message = "Novo Pedido:\n\n";
    
    cartItems.forEach(item => {
        message += `${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
    });
    
    message += `\nTotal: R$ ${total.toFixed(2)}`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
}