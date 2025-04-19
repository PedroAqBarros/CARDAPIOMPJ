handleGoogleMapsError() {
    console.log('Google Maps não disponível, usando fallback');
    this.isGoogleMapsAvailable = false;
    this.updateDeliveryStatus('O serviço de mapa não está disponível no momento. Por favor, entre em contato conosco para confirmar a disponibilidade de entrega.');
}

async geocodeAddress(address) {
    if (!this.isGoogleMapsAvailable) {
        console.log('Usando fallback de geocodificação');
        // Coordenadas aproximadas do centro de Mapejú
        return {
            lat: -7.6000,
            lng: -37.0000
        };
    }

    try {
        const geocoder = new google.maps.Geocoder();
        const response = await new Promise((resolve, reject) => {
            geocoder.geocode({ address: address + ', Mapejú, PE' }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    resolve(results[0].geometry.location);
                } else {
                    reject(new Error('Geocodificação falhou: ' + status));
                }
            });
        });
        return {
            lat: response.lat(),
            lng: response.lng()
        };
    } catch (error) {
        console.error('Erro na geocodificação:', error);
        throw error;
    }
} 