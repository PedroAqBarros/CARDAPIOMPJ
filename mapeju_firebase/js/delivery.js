// Coordenadas da empresa
const STORE_LOCATION = {
    lat: -16.74663483291268,
    lng: -49.22789065029966,
    address: 'R. X-25, 23 - Jardim Olimpico, Aparecida de Goiânia - GO, 74922-310'
};

// Configurações de entrega
const DELIVERY_CONFIG = {
    MIN_ORDER_FREE_DELIVERY: 50.00, // R$ 50,00 expresso em reais
    MAX_DISTANCE: 10, // km
    RATES: [
        { maxDistance: 3, price: 5 },   // Até 3km: R$ 5,00 (grátis para pedidos > R$50)
        { maxDistance: 7, price: 7 },   // Até 7km: R$ 7,00
        { maxDistance: 10, price: 10 }  // Até 10km: R$ 10,00
    ]
};

let deliveryManagerInstance = null;

class DeliveryManager {
    constructor() {
        if (deliveryManagerInstance) {
            return deliveryManagerInstance;
        }
        this.geocoder = null;
        this.autocomplete = null;
        this.addressInput = null;
        this.initialized = false;
        this.isGoogleMapsAvailable = true;
        this.currentDeliveryType = 'delivery'; // Valor padrão
        
        // Configurar inicialização do Google Maps
        if (typeof google !== 'undefined' && google.maps && google.maps.places) {
            // Google Maps já está disponível
            this.initializeGoogleMaps();
        } else {
            // Aguardar o carregamento do Google Maps
            console.log('Aguardando carregamento do Google Maps...');
            window.addEventListener('google_maps_loaded', () => {
                this.initializeGoogleMaps();
            });
            
            // Configurar um timeout para fallback caso o Google Maps não carregue
            setTimeout(() => {
                if (!this.initialized) {
                    console.warn('Timeout ao aguardar Google Maps');
                    this.handleGoogleMapsError();
                }
            }, 10000); // 10 segundos de timeout
        }
        
        deliveryManagerInstance = this;
        return this;
    }

    initializeGoogleMaps() {
        try {
            if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
                throw new Error('Google Maps não está completamente carregado. Aguarde alguns segundos e tente novamente.');
            }

            this.geocoder = new google.maps.Geocoder();
            this.setupAutocomplete();
            this.setupLocationButton();
            this.setupAddressInput();
            this.setupDeliveryTypeToggle();
            
            this.initialized = true;
            console.log('Google Maps inicializado com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar Google Maps:', error);
            this.handleGoogleMapsError();
        }
    }

    setupAutocomplete() {
        const addressInput = document.getElementById('customer-address');
        if (!addressInput) return;

        try {
            if (!google.maps.places.PlaceAutocompleteElement) {
                throw new Error('Places API não está disponível');
            }

            const autocomplete = new google.maps.places.PlaceAutocompleteElement({
                inputElement: addressInput,
                types: ['address'],
                componentRestrictions: { country: 'BR' }
            });

            autocomplete.addEventListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (place && place.geometry) {
                    addressInput.value = place.formatted_address || place.name;
                    addressInput.dispatchEvent(new Event('input'));
                }
            });

            console.log('Autocomplete configurado com sucesso');
        } catch (error) {
            console.error('Erro ao configurar autocomplete:', error);
            this.handleGoogleMapsError();
        }
    }

    setupManualInput(addressInput) {
        console.log('Usando entrada manual de endereço');
        addressInput.placeholder = 'Digite o endereço completo';
        
        // Adicionar instruções de preenchimento
        const helpText = document.createElement('small');
        helpText.style.color = '#666';
        helpText.style.display = 'block';
        helpText.style.marginTop = '5px';
        helpText.innerHTML = 'Ex: Rua X-25, 23 - Jardim Olímpico, Aparecida de Goiânia';
        addressInput.parentNode.appendChild(helpText);

        // Adicionar evento de input para validação básica
        addressInput.addEventListener('input', () => {
            const value = addressInput.value.trim();
            if (value.length > 0 && value.length < 10) {
                helpText.style.color = '#dc3545';
                helpText.textContent = 'Digite um endereço mais completo';
            } else {
                helpText.style.color = '#666';
                helpText.innerHTML = 'Ex: Rua X-25, 23 - Jardim Olímpico, Aparecida de Goiânia';
            }
        });
    }

    setupLocationButton() {
        const locationBtn = document.getElementById('use-location-btn');
        const addressInput = document.getElementById('customer-address');
        
        if (locationBtn && addressInput) {
            locationBtn.addEventListener('click', async () => {
                try {
                    locationBtn.disabled = true;
                    locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Localizando...';
                    
                    const position = await this.getCurrentPosition();
                    const address = await this.reverseGeocode(position.coords.latitude, position.coords.longitude);
                    
                    if (address) {
                        addressInput.value = address;
                        // Disparar o evento de input para calcular a taxa de entrega
                        addressInput.dispatchEvent(new Event('input'));
                    } else {
                        throw new Error('Não foi possível obter o endereço da sua localização.');
                    }
                } catch (error) {
                    console.error('Erro ao obter localização:', error);
                    this.handleError(error.message || 'Não foi possível obter sua localização. Por favor, digite o endereço manualmente.');
                } finally {
                    locationBtn.disabled = false;
                    locationBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Usar minha localização';
                }
            });
        }
    }

    setupAddressInput() {
        const addressInput = document.getElementById('customer-address');
        if (addressInput) {
            addressInput.addEventListener('input', async () => {
                try {
                    // Verificar se estamos no modo de entrega
                    if (this.currentDeliveryType !== 'delivery') {
                        return;
                    }

                    const subtotalElement = document.getElementById('order-subtotal');
                    const deliveryFeeElement = document.getElementById('delivery-fee');
                    const totalElement = document.getElementById('order-total');
                    const deliveryFeeInfo = document.getElementById('delivery-fee-info');
                    
                    if (!subtotalElement || !deliveryFeeElement || !totalElement || !deliveryFeeInfo) {
                        console.error('Elementos não encontrados');
                        return;
                    }

                    // Guardar o valor original do subtotal
                    const subtotalValue = this.extractValue(subtotalElement.textContent);

                    // Se o endereço estiver vazio, resetar valores
                    if (!addressInput.value.trim()) {
                        deliveryFeeElement.textContent = 'R$ 0,00';
                        totalElement.textContent = this.formatValue(subtotalValue);
                        deliveryFeeInfo.innerHTML = '';
                        return;
                    }

                    // Mostrar loading
                    deliveryFeeInfo.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Calculando taxa de entrega...</p>';

                    // Calcular taxa de entrega
                    const result = await this.calculateDeliveryFee(addressInput.value, subtotalValue);

                    // Atualizar interface
                    deliveryFeeElement.textContent = this.formatValue(result.fee);
                    totalElement.textContent = this.formatValue(subtotalValue + result.fee);
                    
                    // Mostrar informações da entrega
                    deliveryFeeInfo.innerHTML = `
                        <p class="distance-info">Distância: ${result.distance.toFixed(1)}km</p>
                        <p class="fee-info">${result.message}</p>
                    `;

                } catch (error) {
                    console.error('Erro ao calcular taxa:', error);
                    this.handleError(error.message);
                }
            });
        }
    }

    // Novo método para configurar a alternância entre entrega e retirada
    setupDeliveryTypeToggle() {
        const deliveryRadio = document.getElementById('delivery-option-delivery');
        const pickupRadio = document.getElementById('delivery-option-pickup');
        const addressContainer = document.getElementById('delivery-address-container');
        const deliveryFeeInfo = document.getElementById('delivery-fee-info');
        const deliveryFeeElement = document.getElementById('delivery-fee');
        const totalElement = document.getElementById('order-total');
        const subtotalElement = document.getElementById('order-subtotal');
        const quadraInput = document.getElementById('quadra');
        const loteInput = document.getElementById('lote');
        
        if (deliveryRadio && pickupRadio && addressContainer) {
            // Função para atualizar a interface com base no tipo de entrega
            const updateDeliveryUI = (isDelivery) => {
                try {
                    this.currentDeliveryType = isDelivery ? 'delivery' : 'pickup';
                    
                    // Mostrar/ocultar campos de endereço
                    addressContainer.style.display = isDelivery ? 'block' : 'none';
                    
                    // Atualizar campos obrigatórios
                    if (quadraInput && loteInput) {
                        quadraInput.required = isDelivery;
                        loteInput.required = isDelivery;
                    }
                    
                    // Atualizar taxa de entrega e total
                    if (deliveryFeeElement && totalElement && subtotalElement) {
                        const subtotalValue = this.extractValue(subtotalElement.textContent);
                        
                        if (!isDelivery) {
                            // Retirada: taxa zero
                            deliveryFeeElement.textContent = 'R$ 0,00';
                            totalElement.textContent = this.formatValue(subtotalValue);
                            
                            if (deliveryFeeInfo) {
                                deliveryFeeInfo.innerHTML = `
                                    <p class="fee-info" style="color: #28a745;">
                                        <i class="fas fa-store"></i> Retirada na loja: sem taxa de entrega
                                    </p>
                                    <p class="store-address" style="font-size: 0.9em; margin-top: 5px;">
                                        Endereço: ${STORE_LOCATION.address}
                                    </p>
                                `;
                            }
                        } else {
                            // Entrega: recalcular taxa se houver endereço
                            const addressInput = document.getElementById('customer-address');
                            if (addressInput && addressInput.value.trim()) {
                                // Disparar evento de input para recalcular
                                addressInput.dispatchEvent(new Event('input'));
                            } else {
                                // Sem endereço ainda
                                deliveryFeeElement.textContent = 'R$ 0,00';
                                totalElement.textContent = this.formatValue(subtotalValue);
                                
                                if (deliveryFeeInfo) {
                                    deliveryFeeInfo.innerHTML = `
                                        <p class="fee-info">
                                            Digite seu endereço para calcular a taxa de entrega
                                        </p>
                                    `;
                                }
                            }
                        }
                    }
                    
                    console.log(`Modo de entrega alterado para: ${this.currentDeliveryType}`);
                } catch (error) {
                    console.error('Erro ao atualizar UI de entrega:', error);
                }
            };
            
            // Configurar eventos para os radio buttons
            deliveryRadio.addEventListener('change', () => {
                if (deliveryRadio.checked) {
                    updateDeliveryUI(true);
                }
            });
            
            pickupRadio.addEventListener('change', () => {
                if (pickupRadio.checked) {
                    updateDeliveryUI(false);
                }
            });
            
            // Inicializar com o valor atual
            updateDeliveryUI(deliveryRadio.checked);
        }
    }

    handleError(message) {
        const deliveryFeeInfo = document.getElementById('delivery-fee-info');
        const deliveryFeeElement = document.getElementById('delivery-fee');
        const totalElement = document.getElementById('order-total');
        const subtotalElement = document.getElementById('order-subtotal');
        
        if (deliveryFeeInfo) {
            deliveryFeeInfo.innerHTML = `
                <p class="error-message" style="color: #dc3545;">
                    <i class="fas fa-exclamation-circle"></i> ${message}
                </p>
                <p style="font-size: 0.9em; margin-top: 5px;">
                    Se o problema persistir, entre em contato pelo WhatsApp para finalizar seu pedido.
                </p>
            `;
        }
        
        if (deliveryFeeElement && totalElement && subtotalElement) {
            const subtotalValue = this.extractValue(subtotalElement.textContent);
            deliveryFeeElement.textContent = 'R$ 0,00';
            totalElement.textContent = this.formatValue(subtotalValue);
        }
    }

    extractValue(text) {
        if (!text) return 0;
        const cleanText = text.replace(/[^0-9,\.]/g, '').replace(',', '.');
        return parseFloat(cleanText) || 0;
    }

    formatValue(value) {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Seu navegador não suporta geolocalização.'));
                return;
            }

            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        });
    }

    async reverseGeocode(lat, lng) {
        if (!this.isGoogleMapsAvailable) {
            console.log('Usando fallback de geocodificação reversa');
            return 'Endereço não disponível';
        }

        try {
            const geocoder = new google.maps.Geocoder();
            const response = await new Promise((resolve, reject) => {
                geocoder.geocode({ 
                    location: { lat, lng },
                    region: 'BR'
                }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        resolve(results[0].formatted_address);
                    } else {
                        reject(new Error('Geocodificação reversa falhou: ' + status));
                    }
                });
            });
            return response;
        } catch (error) {
            console.error('Erro na geocodificação reversa:', error);
            throw error;
        }
    }

    async calculateDeliveryFee(address, orderTotal) {
        if (!this.initialized) {
            throw new Error('O serviço de entrega ainda não foi inicializado.');
        }

        try {
            console.log('Iniciando cálculo de taxa para:', address);
            const coordinates = await this.getCoordinatesFromAddress(address);
            console.log('Coordenadas obtidas:', coordinates);

            if (!coordinates) {
                throw new Error('Não foi possível localizar o endereço. Por favor, verifique se está correto.');
            }

            let distance = this.calculateDistance(coordinates);
            console.log('Distância calculada:', distance);

            // Se a distância for zero ou nula, aplicar uma distância mínima padrão
            if (!distance || distance === 0) {
                distance = 1.0; // Distância mínima padrão de 1km
                console.log('Aplicando distância mínima padrão:', distance);
            }

            console.log(`Cálculo de entrega - Distância: ${distance.toFixed(2)}km, Valor do pedido: R$${orderTotal.toFixed(2)}`);

            if (distance > DELIVERY_CONFIG.MAX_DISTANCE) {
                throw new Error(`Desculpe, não entregamos para endereços além de ${DELIVERY_CONFIG.MAX_DISTANCE}km de distância.`);
            }

            let rate = DELIVERY_CONFIG.RATES.find(r => distance <= r.maxDistance);
            if (!rate) {
                throw new Error('Não foi possível calcular a taxa de entrega para este endereço.');
            }

            // Verificar se é elegível para entrega gratuita
            if (orderTotal >= DELIVERY_CONFIG.MIN_ORDER_FREE_DELIVERY && distance <= 3) {
                return {
                    fee: 0,
                    distance: distance,
                    message: `Entrega gratuita! (Pedido acima de R$ ${DELIVERY_CONFIG.MIN_ORDER_FREE_DELIVERY.toFixed(2)} e distância até 3km)`
                };
            }

            return {
                fee: rate.price,
                distance: distance,
                message: `Taxa de entrega: R$ ${rate.price.toFixed(2)} (${distance.toFixed(1)}km)`
            };

        } catch (error) {
            console.error('Erro ao calcular taxa de entrega:', error);
            throw error;
        }
    }

    calculateDistance(destination) {
        try {
            const R = 6371; // Raio da Terra em km
            const dLat = this.toRad(destination.lat - STORE_LOCATION.lat);
            const dLng = this.toRad(destination.lng - STORE_LOCATION.lng);
            
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                     Math.cos(this.toRad(STORE_LOCATION.lat)) * Math.cos(this.toRad(destination.lat)) *
                     Math.sin(dLng/2) * Math.sin(dLng/2);
            
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c;
            
            // Ajuste de 10% para compensar rotas reais, garantindo pelo menos 0.1km
            let adjustedDistance = parseFloat((distance * 1.1).toFixed(1));
            if (adjustedDistance === 0 && distance > 0) {
                adjustedDistance = 0.1; // Garante um valor mínimo se a distância original for maior que zero
            }
            
            console.log('Cálculo de distância:', {
                origem: STORE_LOCATION,
                destino: destination,
                distanciaEmLinhaReta: distance.toFixed(2),
                distanciaAjustada: adjustedDistance.toFixed(1) // Mantém uma casa decimal
            });

            return adjustedDistance;
        } catch (error) {
            console.error('Erro no cálculo da distância:', error);
            return null;
        }
    }

    toRad(degrees) {
        return degrees * (Math.PI/180);
    }

    handleGoogleMapsError() {
        console.log('Google Maps não disponível, usando fallback');
        this.isGoogleMapsAvailable = false;
        this.updateDeliveryStatus(
            `Serviço de mapa indisponível!<br>
            Estamos usando um sistema alternativo para calcular a taxa de entrega.<br>
            A taxa exibida é aproximada. Para confirmar o valor exato antes da finalização do pedido, 
            entre em contato conosco pelo WhatsApp.`
        );

        // Configurar entrada manual para o endereço
        const addressInput = document.getElementById('customer-address');
        if (addressInput) {
            this.setupManualInput(addressInput);
        }
    }

    updateDeliveryStatus(message) {
        const deliveryFeeInfo = document.getElementById('delivery-fee-info');
        if (deliveryFeeInfo) {
            deliveryFeeInfo.innerHTML = `
                <div class="warning-message" style="color: #ffc107;">
                    <i class="fas fa-exclamation-triangle"></i> ${message}
                </div>
            `;
        }
    }

    async getCoordinatesFromAddress(address) {
        if (!this.isGoogleMapsAvailable) {
            console.log('Usando fallback de geocodificação');
            return this.getFallbackCoordinates(address);
        }

        try {
            console.log('Iniciando geocodificação para:', address);
            const geocoder = new google.maps.Geocoder();
            
            // Primeiro, tenta com o endereço completo
            const results = await new Promise((resolve, reject) => {
                geocoder.geocode({ 
                    address: address,
                    region: 'BR'
                }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        resolve(results[0].geometry.location);
                    } else {
                        reject(new Error('Geocodificação falhou: ' + status));
                    }
                });
            });
            
            return {
                lat: results.lat(),
                lng: results.lng()
            };
        } catch (error) {
            console.error('Erro na geocodificação:', error);
            throw new Error('Não foi possível localizar o endereço. Por favor, verifique se está correto.');
        }
    }

    getFallbackCoordinates(address) {
        // Implementação melhorada para quando o Google Maps não está disponível
        console.log('Usando coordenadas da loja como fallback');
        
        // Usar coordenadas da loja com um pequeno deslocamento aleatório
        // para evitar que a distância seja sempre zero
        const randomOffset = () => (Math.random() * 0.01) - 0.005; // ±0.005 graus (~500m)
        
        return {
            lat: STORE_LOCATION.lat + randomOffset(),
            lng: STORE_LOCATION.lng + randomOffset()
        };
    }
}

// Inicializar o gerenciador de entrega quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Criar instância do gerenciador de entrega
        window.deliveryManager = new DeliveryManager();
        
        console.log('Gerenciador de entrega inicializado');
    } catch (error) {
        console.error('Erro ao inicializar gerenciador de entrega:', error);
    }
});
