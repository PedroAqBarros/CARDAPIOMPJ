// Estrutura de dados para armazenar categorias e produtos
let appData = {
    categories: [],
    products: [],
    cart: []
};

// Função para salvar dados no localStorage
function saveData() {
    localStorage.setItem('mapejuCardapioData', JSON.stringify(appData));
}

// Função para carregar dados do localStorage
function loadData() {
    const savedData = localStorage.getItem('mapejuCardapioData');
    if (savedData) {
        appData = JSON.parse(savedData);
    } else {
        // Dados iniciais de exemplo
        appData = {
            categories: [
                { id: 1, name: 'Brigadeiros' },
                { id: 2, name: 'Bolos' },
                { id: 3, name: 'Doces Especiais' }
            ],
            products: [
                { 
                    id: 1, 
                    categoryId: 1, 
                    name: 'Brigadeiro Tradicional', 
                    description: 'Delicioso brigadeiro tradicional feito com chocolate de qualidade.', 
                    price: 3.50, 
                    image: 'img/brigadeiro-tradicional.jpg' 
                },
                { 
                    id: 2, 
                    categoryId: 1, 
                    name: 'Brigadeiro Gourmet', 
                    description: 'Brigadeiro especial com chocolate belga e granulado fino.', 
                    price: 5.00, 
                    image: 'img/brigadeiro-gourmet.jpg' 
                },
                { 
                    id: 3, 
                    categoryId: 2, 
                    name: 'Bolo de Chocolate', 
                    description: 'Bolo de chocolate fofinho com cobertura de ganache.', 
                    price: 45.00, 
                    image: 'img/bolo-chocolate.jpg' 
                },
                { 
                    id: 4, 
                    categoryId: 2, 
                    name: 'Bolo Red Velvet', 
                    description: 'Bolo red velvet com cobertura de cream cheese.', 
                    price: 55.00, 
                    image: 'img/bolo-red-velvet.jpg' 
                },
                { 
                    id: 5, 
                    categoryId: 3, 
                    name: 'Trufa de Chocolate', 
                    description: 'Trufa de chocolate meio amargo com recheio cremoso.', 
                    price: 6.50, 
                    image: 'img/trufa-chocolate.jpg' 
                }
            ],
            cart: []
        };
        saveData();
    }
}

// Carregar dados ao inicializar
loadData();

// Função para gerar um ID único
function generateId(collection) {
    if (collection.length === 0) {
        return 1;
    }
    return Math.max(...collection.map(item => item.id)) + 1;
}

// Funções para gerenciar categorias
function addCategory(name) {
    const newCategory = {
        id: generateId(appData.categories),
        name: name
    };
    appData.categories.push(newCategory);
    saveData();
    return newCategory;
}

function updateCategory(id, name) {
    const category = appData.categories.find(cat => cat.id === id);
    if (category) {
        category.name = name;
        saveData();
        return true;
    }
    return false;
}

function deleteCategory(id) {
    // Verificar se existem produtos nesta categoria
    const productsInCategory = appData.products.filter(product => product.categoryId === id);
    if (productsInCategory.length > 0) {
        return { success: false, message: 'Esta categoria possui produtos. Remova os produtos primeiro.' };
    }
    
    const initialLength = appData.categories.length;
    appData.categories = appData.categories.filter(cat => cat.id !== id);
    
    if (appData.categories.length < initialLength) {
        saveData();
        return { success: true };
    }
    
    return { success: false, message: 'Categoria não encontrada.' };
}

// Funções para gerenciar produtos
function addProduct(categoryId, name, description, price, image) {
    const newProduct = {
        id: generateId(appData.products),
        categoryId: parseInt(categoryId),
        name: name,
        description: description,
        price: parseFloat(price),
        image: image || `img/default-product.jpg`
    };
    appData.products.push(newProduct);
    saveData();
    return newProduct;
}

function updateProduct(id, categoryId, name, description, price, image) {
    const product = appData.products.find(prod => prod.id === id);
    if (product) {
        product.categoryId = parseInt(categoryId);
        product.name = name;
        product.description = description;
        product.price = parseFloat(price);
        if (image) {
            product.image = image;
        }
        saveData();
        return true;
    }
    return false;
}

function deleteProduct(id) {
    const initialLength = appData.products.length;
    appData.products = appData.products.filter(prod => prod.id !== id);
    
    // Também remover o produto do carrinho se estiver lá
    appData.cart = appData.cart.filter(item => item.productId !== id);
    
    if (appData.products.length < initialLength) {
        saveData();
        return true;
    }
    return false;
}

// Funções para gerenciar o carrinho
function addToCart(productId) {
    const product = appData.products.find(prod => prod.id === productId);
    if (!product) return false;
    
    const existingItem = appData.cart.find(item => item.productId === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        appData.cart.push({
            productId: productId,
            quantity: 1
        });
    }
    saveData();
    return true;
}

function updateCartItemQuantity(productId, quantity) {
    const cartItem = appData.cart.find(item => item.productId === productId);
    if (cartItem) {
        if (quantity <= 0) {
            // Remover item se a quantidade for zero ou negativa
            appData.cart = appData.cart.filter(item => item.productId !== productId);
        } else {
            cartItem.quantity = quantity;
        }
        saveData();
        return true;
    }
    return false;
}

function removeFromCart(productId) {
    const initialLength = appData.cart.length;
    appData.cart = appData.cart.filter(item => item.productId !== productId);
    
    if (appData.cart.length < initialLength) {
        saveData();
        return true;
    }
    return false;
}

function clearCart() {
    appData.cart = [];
    saveData();
}

function getCartTotal() {
    return appData.cart.reduce((total, item) => {
        const product = appData.products.find(prod => prod.id === item.productId);
        return total + (product ? product.price * item.quantity : 0);
    }, 0);
}

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
