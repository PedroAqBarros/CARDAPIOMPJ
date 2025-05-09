// Referência ao endereço da loja do arquivo delivery.js
// Se STORE_LOCATION não estiver disponível, definimos um endereço padrão
const STORE_ADDRESS = {
    address: 'R. X-25, 23 - Jardim Olimpico, Aparecida de Goiânia - GO, 74922-310'
};

// Obter endereço da loja de forma segura
function getStoreAddress() {
    // Verificar se STORE_LOCATION está disponível globalmente
    if (typeof STORE_LOCATION !== 'undefined') {
        return STORE_LOCATION.address;
    }
    return STORE_ADDRESS.address;
}

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

// Função para formatar o pedido para o WhatsApp
function formatOrderMessage(items, deliveryInfo, customerInfo) {
    const parts = [];
    
    // Cabeçalho
    parts.push(`*Novo pedido de ${customerInfo.name}*`);
    parts.push('');
    
    // Itens do pedido
    parts.push('*Itens do pedido:*');
    
    let subtotal = 0;
    
    items.forEach((item, index) => {
        let itemPrice = parseFloat(item.price);
        let itemText = `${index + 1}. ${item.name} x${item.quantity}`;
        
        // Adicionar informação de sabores, suportando múltiplos sabores
        if (item.flavors && item.flavors.length > 0) {
            const flavorNames = item.flavors.map(f => f.name).join(', ');
            itemText += ` - *Sabores: ${flavorNames}*`;
            
            // Adicionar preço extra dos sabores, se houver
            item.flavors.forEach(flavor => {
                if (flavor.extraPrice && parseFloat(flavor.extraPrice) > 0) {
                    itemPrice += parseFloat(flavor.extraPrice);
                    itemText += ` (+R$ ${parseFloat(flavor.extraPrice).toFixed(2)})`;
                }
            });
        }
        // Compatibilidade com formato antigo (sabor único)
        else if (item.flavor) {
            itemText += ` - *Sabor: ${item.flavor.name}*`;
            
            // Adicionar preço extra do sabor, se houver
            if (item.flavor.extraPrice > 0) {
                itemPrice += parseFloat(item.flavor.extraPrice);
                itemText += ` (+R$ ${parseFloat(item.flavor.extraPrice).toFixed(2)})`;
            }
        }
        
        // Adicionar preço unitário
        itemText += ` - R$ ${itemPrice.toFixed(2)}/un`;
        
        // Calcular e adicionar total do item
        const itemTotal = itemPrice * item.quantity;
        itemText += ` = R$ ${itemTotal.toFixed(2)}`;
        
        parts.push(itemText);
        subtotal += itemTotal;
    });
    
    parts.push('');
    parts.push(`*Subtotal:* R$ ${subtotal.toFixed(2)}`);
    
    // Informações de entrega
    if (deliveryInfo && deliveryInfo.mode) {
        parts.push('');
        parts.push('*Informações de entrega:*');
        
        if (deliveryInfo.mode === 'delivery') {
            parts.push(`Modo: Entrega`);
            
            if (deliveryInfo.address) {
                parts.push(`Endereço: ${deliveryInfo.address}`);
            }
            
            if (deliveryInfo.fee) {
                parts.push(`Taxa de entrega: R$ ${parseFloat(deliveryInfo.fee).toFixed(2)}`);
                
                // Adicionar o total com entrega
                const totalWithDelivery = subtotal + parseFloat(deliveryInfo.fee);
                parts.push(`*Total com entrega:* R$ ${totalWithDelivery.toFixed(2)}`);
            }
        } else if (deliveryInfo.mode === 'pickup') {
            parts.push(`Modo: Retirada na loja`);
            parts.push(`*Total:* R$ ${subtotal.toFixed(2)}`);
        }
    } else {
        // Se não houver informações de entrega, mostrar apenas o total
        parts.push('');
        parts.push(`*Total:* R$ ${subtotal.toFixed(2)}`);
    }
    
    // Informações adicionais do cliente
    parts.push('');
    parts.push('*Informações do cliente:*');
    parts.push(`Nome: ${customerInfo.name}`);
    
    if (customerInfo.phone) {
        parts.push(`Telefone: ${customerInfo.phone}`);
    }
    
    if (customerInfo.notes) {
        parts.push('');
        parts.push('*Observações:*');
        parts.push(customerInfo.notes);
    }
    
    // Juntar todas as partes com quebras de linha
    return parts.join('\n');
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
    if (!mainAddress) {
        throw new Error('Endereço é obrigatório');
    }

    let parts = [mainAddress];
    
    // Adicionar quadra e lote se fornecidos
    if (quadra && lote) {
        parts.push(`Quadra ${quadra}, Lote ${lote}`);
    }
    
    // Adicionar complemento se fornecido
    if (complemento) {
        parts.push(complemento);
    }
    
    return parts.filter(part => part.trim()).join(' - ');
}

// Função para enviar pedido para WhatsApp
function sendToWhatsApp(cartItems) {
    console.log('Iniciando processo de envio de pedido para WhatsApp', cartItems);
    
    const modal = document.getElementById('checkout-modal');
    const form = document.getElementById('checkout-form');
    const addressInput = document.getElementById('customer-address');
    const quadraInput = document.getElementById('quadra');
    const loteInput = document.getElementById('lote');
    const complementoInput = document.getElementById('complemento');
    const paymentMethod = document.getElementById('payment-method');
    const changeContainer = document.getElementById('change-container');
    
    // Verificar elementos obrigatórios
    if (!modal || !form) {
        console.error('Erro: Elementos do checkout não encontrados', { modal, form });
        alert('Erro ao iniciar o checkout. Por favor, tente novamente.');
        return;
    }
    
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
        console.log('Formulário de checkout enviado!');
        e.preventDefault();
        
        try {
            // Verificar se o nome foi preenchido
            const customerName = document.getElementById('customer-name').value.trim();
            if (!customerName) {
                alert('Por favor, informe seu nome.');
                return;
            }
            
            // Verificar se o método de pagamento foi selecionado
            const paymentMethodValue = paymentMethod.value;
            if (!paymentMethodValue) {
                alert('Por favor, selecione uma forma de pagamento.');
                return;
            }
            
            // Obter o tipo de entrega selecionado
            const deliveryType = document.querySelector('input[name="delivery-type"]:checked').value;
            console.log('Tipo de entrega selecionado:', deliveryType);
            
            // Verificar campos obrigatórios apenas se for entrega
            if (deliveryType === 'delivery') {
                if (!addressInput.value.trim()) {
                    alert('Por favor, informe o endereço de entrega.');
                    return;
                }
                
                // Verificar quadra e lote apenas se for entrega
                if (!quadraInput.value.trim() || !loteInput.value.trim()) {
                    alert('Por favor, preencha a Quadra e o Lote.');
                    return;
                }
            }

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
                    console.error('Erro ao calcular taxa de entrega:', err);
                    alert('Erro ao calcular taxa de entrega: ' + err.message);
                    return;
                }
            } else {
                // No modo pickup, garantir que o botão esteja habilitado e a taxa seja zero
                fee = 0;
                console.log('Modo pickup selecionado, taxa de entrega é zero');
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
            message += `Nome: ${customerName}\n`;
            if (deliveryType === 'delivery') {
                message += `Endereço: ${fullAddress}\n`;
            } else {
                message += `Forma de Recebimento: Retirada no Local\n`;
                message += `Endereço da Loja: ${getStoreAddress()}\n`;
            }
            
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
                let itemMessage = `▫️ ${item.quantity}x ${item.name}`;
                
                // Verificar se o item tem múltiplos sabores
                if (item.flavors && item.flavors.length > 0) {
                    const flavorNames = item.flavors.map(f => f.name).join(', ');
                    itemMessage += ` - Sabores: ${flavorNames}`;
                    
                    // Adicionar preço extra dos sabores, se houver
                    let extraPrice = 0;
                    item.flavors.forEach(flavor => {
                        if (flavor.extraPrice && parseFloat(flavor.extraPrice) > 0) {
                            extraPrice += parseFloat(flavor.extraPrice);
                        }
                    });
                    
                    if (extraPrice > 0) {
                        itemMessage += ` (+R$ ${extraPrice.toFixed(2)})`;
                    }
                }
                // Compatibilidade com formato antigo
                else if (item.flavor && item.flavor.name) {
                    itemMessage += ` - Sabor: ${item.flavor.name}`;
                    
                    // Adicionar preço extra do sabor, se houver
                    if (item.flavor.extraPrice && parseFloat(item.flavor.extraPrice) > 0) {
                        itemMessage += ` (+R$ ${parseFloat(item.flavor.extraPrice).toFixed(2)})`;
                    }
                }
                
                itemMessage += ` - R$ ${itemTotal.toFixed(2)}\n`;
                message += itemMessage;
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
            
            // Abrir WhatsApp em nova janela
            const whatsappWindow = window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
            
            // Verificar se a janela foi aberta com sucesso
            if (!whatsappWindow || whatsappWindow.closed || typeof whatsappWindow.closed === 'undefined') {
                // Fallback para dispositivos que bloqueiam popups
                alert('Seu navegador bloqueou a abertura do WhatsApp. Vamos tentar novamente.');
                window.location.href = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
            }
            
        } catch (error) {
            console.error('Erro ao processar pedido:', error);
            alert('Ocorreu um erro ao processar seu pedido: ' + error.message);
        }
    };
    
    // Mostrar modal
    modal.style.display = 'block';
    
    // Se o modo de entrega for pickup, habilitar o botão de checkout
    const initialDeliveryType = document.querySelector('input[name="delivery-type"]:checked')?.value;
    const submitButton = form.querySelector('.submit-btn');
    
    if (initialDeliveryType === 'pickup' && submitButton) {
        console.log('Habilitando o botão de checkout para o modo pickup');
        submitButton.disabled = false;
    }
    
    // Adicionar listener para mudança no tipo de entrega
    const deliveryOptions = document.querySelectorAll('input[name="delivery-type"]');
    deliveryOptions.forEach(option => {
        option.addEventListener('change', function() {
            if (this.value === 'pickup' && submitButton) {
                console.log('Modo pickup selecionado, habilitando botão');
                submitButton.disabled = false;
            }
        });
    });
    
    // Verificar se o modal foi aberto em um dispositivo móvel
    if (window.innerWidth < 768) {
        // Rolar para o topo do modal em dispositivos móveis
        setTimeout(() => {
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }
}

// Disponibilizar função globalmente
window.whatsappIntegration = {
    sendWhatsAppMessage,
    addQuickOrderButtons,
    sendToWhatsApp
};
