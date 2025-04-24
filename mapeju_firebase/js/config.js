// Configurações da aplicação
const APP_CONFIG = {
    // Método de inicialização (para compatibilidade com a estrutura atual)
    async init() {
        // Notifica que as configurações foram carregadas
        window.dispatchEvent(new Event('app_config_loaded'));
    },
    
    // Configurações diretas com as chaves originais
    GOOGLE_MAPS_API_KEY: 'AIzaSyBrimCGWjJF76ptFZu7frm0hB9iw4Ty0p8',
    
    // Firebase Config
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyBzGL3MFuCDUUmR8rY1eshqB8S5SRKBVZI",
        authDomain: "mapeju-cardapio.firebaseapp.com",
        projectId: "mapeju-cardapio",
        storageBucket: "mapeju-cardapio.appspot.com",
        messagingSenderId: "1055368224770",
        appId: "1:1055368224770:web:f3a5771fc333f192a3071b",
        measurementId: "G-00FD2KZEGE"
    },
    
    // WhatsApp
    WHATSAPP_NUMBER: '556294535053'
}; 

// Inicializa as configurações quando o arquivo for carregado
document.addEventListener('DOMContentLoaded', () => {
    APP_CONFIG.init();
}); 