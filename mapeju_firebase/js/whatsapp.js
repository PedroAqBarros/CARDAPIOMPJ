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
    cartItems.forEach(item => {
        const itemTotal = item.price * item.quantity;
        message += `▫️ ${item.quantity}x ${item.name} - R$ ${itemTotal.toFixed(2)}\n`;
    });
    
    // Adicionar subtotal, taxa de entrega e total
    message += `\n*Subtotal: R$ ${customerInfo.subtotal.toFixed(2)}*`;
    message += `\n*Taxa de Entrega: R$ ${customerInfo.deliveryFee.toFixed(2)}*`;
    message += `\n*Total: R$ ${customerInfo.total.toFixed(2)}*`;
    
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

// Função para formatar o endereço completo
function formatFullAddress(mainAddress, quadra, lote, complemento) {
    if (!mainAddress || !quadra || !lote) {
        throw new Error('Endereço, Quadra e Lote são obrigatórios');
    }

    let parts = [mainAddress];
    
    // Adicionar quadra e lote (agora obrigatórios)
    parts.push(`Quadra ${quadra}, Lote ${lote}`);
    
    // Adicionar complemento se fornecido
    if (complemento) {
        parts.push(complemento);
    }
    
    return parts.filter(part => part.trim()).join(' - ');
}

// Função para enviar pedido para WhatsApp
function sendToWhatsApp(cartItems) {
    const modal = document.getElementById('checkout-modal');
    const form = document.getElementById('checkout-form');
    const addressInput = document.getElementById('customer-address');
    const quadraInput = document.getElementById('quadra');
    const loteInput = document.getElementById('lote');
    const complementoInput = document.getElementById('complemento');
    const paymentMethod = document.getElementById('payment-method');
    const changeContainer = document.getElementById('change-container');
    
    // Obter os elementos diretamente pelos IDs
    const orderSubtotalElement = document.getElementById('order-subtotal');
    const deliveryFeeElement = document.getElementById('delivery-fee');
    const orderTotalElement = document.getElementById('order-total');
    
    // Calcular subtotal dos produtos e exibir
    const initialSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    orderSubtotalElement.textContent = `R$ ${initialSubtotal.toFixed(2)}`;
    // Inicializar valores de entrega e total
    deliveryFeeElement.textContent = 'R$ 0,00';
    orderTotalElement.textContent = `R$ ${initialSubtotal.toFixed(2)}`;
    
    if (!orderSubtotalElement || !deliveryFeeElement || !orderTotalElement) {
        console.error('Erro: Elementos de preço não encontrados no DOM');
        alert('Erro ao processar valores. Por favor, tente novamente.');
        return;
    }
    
    const closeBtn = modal.querySelector('.close');
    
    // Se o método de pagamento for dinheiro, mostrar campo de troco
    paymentMethod.addEventListener('change', function() {
        if (this.value === 'dinheiro') {
            changeContainer.style.display = 'block';
        } else {
            changeContainer.style.display = 'none';
        }
    });
    
    // Fechar modal quando clicar em X
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Fechar quando clicar fora do modal
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Processar formulário
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        // Verificar campos obrigatórios apenas se for entrega
        const deliveryType = document.querySelector('input[name="delivery-type"]:checked').value;
        if (deliveryType === 'delivery' && (!quadraInput.value.trim() || !loteInput.value.trim())) {
            alert('Por favor, preencha a Quadra e o Lote.');
            return;
        }

        try {
            // Formatar endereço completo se for entrega
            let fullAddress = '';
            if (deliveryType === 'delivery') {
                fullAddress = formatFullAddress(
                    addressInput.value.trim(),
                    quadraInput.value.trim(),
                    loteInput.value.trim(),
                    complementoInput.value.trim()
                );
            }

            // Extrair subtotal atual
            const subtotal = parseFloat(
                orderSubtotalElement.textContent
                    .replace(/[^0-9,\.]/g, '')
                    .replace(',', '.')
            ) || 0;
            
            // Calcular taxa de entrega apenas se for entrega
            let deliveryInfo;
            let fee = 0;
            if (deliveryType === 'delivery') {
                try {
                    deliveryInfo = await window.deliveryManager.calculateDeliveryFee(
                        fullAddress, subtotal
                    );
                    fee = deliveryInfo.fee;
                } catch (err) {
                    alert('Erro ao calcular taxa de entrega: ' + err.message);
                    return;
                }
            }
            const total = subtotal + fee;
            
            // Atualizar elementos na interface
            deliveryFeeElement.textContent = `R$ ${fee.toFixed(2)}`;
            orderTotalElement.textContent = `R$ ${total.toFixed(2)}`;
            
            console.log('Resumo do pedido:', {
                tipo: deliveryType,
                itens: cartItems.length,
                subtotal: `R$ ${subtotal.toFixed(2)}`,
                entrega: `R$ ${fee.toFixed(2)}`,
                total: `R$ ${total.toFixed(2)}`
            });
            
            // Construir mensagem para WhatsApp
            let message = '🛒 *Novo Pedido*\n\n';
            
            // Adicionar informações do cliente
            message += '*Dados do Cliente*\n';
            message += `Nome: ${document.getElementById('customer-name').value}\n`;
            if (deliveryType === 'delivery') {
                message += `Endereço: ${fullAddress}\n`;
            } else {
                message += `Forma de Recebimento: Retirada no Local\n`;
                message += `Endereço da Loja: ${STORE_LOCATION.address}\n`;
            }
            const paymentMethodValue = paymentMethod.value;
            message += `Forma de Pagamento: ${formatPaymentMethod(paymentMethodValue)}`;
            
            if (paymentMethodValue === 'dinheiro') {
                const changeAmount = document.getElementById('change-amount').value;
                if (changeAmount) {
                    message += `\nTroco para: R$ ${changeAmount}`;
                }
            }
            
            message += '\n\n*Itens do Pedido*\n';
            
            // Adicionar itens do carrinho
            cartItems.forEach(item => {
                const itemTotal = item.price * item.quantity;
                message += `▫️ ${item.quantity}x ${item.name} - R$ ${itemTotal.toFixed(2)}\n`;
            });
            
            // Adicionar subtotal, taxa de entrega e total
            message += `\n*Subtotal: R$ ${subtotal.toFixed(2)}*`;
            if (deliveryType === 'delivery') {
                message += `\n*Taxa de Entrega: R$ ${fee.toFixed(2)}*`;
            }
            message += `\n*Total: R$ ${total.toFixed(2)}*`;
            
            const encodedMessage = encodeURIComponent(message);
            const whatsappNumber = '5562994535053';
            
            // Fechar modal
            modal.style.display = 'none';
            
            // Limpar formulário
            form.reset();
            
            // Abrir WhatsApp
            window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
        } catch (error) {
            alert(error.message);
        }
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