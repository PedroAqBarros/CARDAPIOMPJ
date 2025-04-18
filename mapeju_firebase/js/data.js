// Módulo de dados com integração Firebase
document.addEventListener('DOMContentLoaded', function() {
    // Estrutura de dados da aplicação
    window.appData = {
        cart: []
    };

    // Funções para gerenciar categorias
    window.categoryManager = {
        // Obter todas as categorias
        getCategories: async function() {
            try {
                const snapshot = await categoriesRef.orderBy('name').get();
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Erro ao obter categorias:', error);
                showNotification('Erro ao carregar categorias', 'error');
                return [];
            }
        },
        
        // Adicionar categoria
        addCategory: async function(name) {
            try {
                const newCategory = {
                    name: name,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                const docRef = await categoriesRef.add(newCategory);
                return {
                    id: docRef.id,
                    ...newCategory
                };
            } catch (error) {
                console.error('Erro ao adicionar categoria:', error);
                showNotification('Erro ao adicionar categoria', 'error');
                return null;
            }
        },
        
        // Atualizar categoria
        updateCategory: async function(categoryId, name) {
            try {
                await categoriesRef.doc(categoryId).update({
                    name: name,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                return true;
            } catch (error) {
                console.error('Erro ao atualizar categoria:', error);
                showNotification('Erro ao atualizar categoria', 'error');
                return false;
            }
        },
        
        // Excluir categoria
        deleteCategory: async function(categoryId) {
            try {
                // Verificar se existem produtos nesta categoria
                const productsSnapshot = await productsRef
                    .where('categoryId', '==', categoryId)
                    .limit(1)
                    .get();
                
                if (!productsSnapshot.empty) {
                    return {
                        success: false,
                        message: 'Esta categoria possui produtos. Remova os produtos primeiro.'
                    };
                }
                
                await categoriesRef.doc(categoryId).delete();
                return {
                    success: true
                };
            } catch (error) {
                console.error('Erro ao excluir categoria:', error);
                return {
                    success: false,
                    message: 'Erro ao excluir categoria: ' + error.message
                };
            }
        }
    };
    
    // Funções para gerenciar produtos
    window.productManager = {
        // Obter todos os produtos
        getProducts: async function() {
            try {
                const snapshot = await productsRef.orderBy('name').get();
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Erro ao obter produtos:', error);
                showNotification('Erro ao carregar produtos', 'error');
                return [];
            }
        },
        
        // Obter produtos por categoria
        getProductsByCategory: async function(categoryId) {
            try {
                const snapshot = await productsRef
                    .where('categoryId', '==', categoryId)
                    .orderBy('name')
                    .get();
                
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Erro ao obter produtos por categoria:', error);
                showNotification('Erro ao carregar produtos', 'error');
                return [];
            }
        },
        
        // Adicionar produto
        addProduct: async function(categoryId, name, description, price, image) {
            try {
                const newProduct = {
                    categoryId: categoryId,
                    name: name,
                    description: description || '',
                    price: parseFloat(price),
                    image: image || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                const docRef = await productsRef.add(newProduct);
                return {
                    id: docRef.id,
                    ...newProduct
                };
            } catch (error) {
                console.error('Erro ao adicionar produto:', error);
                showNotification('Erro ao adicionar produto', 'error');
                return null;
            }
        },
        
        // Atualizar produto
        updateProduct: async function(productId, categoryId, name, description, price, image) {
            try {
                await productsRef.doc(productId).update({
                    categoryId: categoryId,
                    name: name,
                    description: description || '',
                    price: parseFloat(price),
                    image: image || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                return true;
            } catch (error) {
                console.error('Erro ao atualizar produto:', error);
                showNotification('Erro ao atualizar produto', 'error');
                return false;
            }
        },
        
        // Excluir produto
        deleteProduct: async function(productId) {
            try {
                await productsRef.doc(productId).delete();
                return true;
            } catch (error) {
                console.error('Erro ao excluir produto:', error);
                showNotification('Erro ao excluir produto', 'error');
                return false;
            }
        }
    };
    
    // Funções para gerenciar o carrinho
    window.cartManager = {
        // Adicionar item ao carrinho
        addToCart: function(productId) {
            const existingItem = appData.cart.find(item => item.productId === productId);
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                appData.cart.push({
                    productId: productId,
                    quantity: 1
                });
            }
        },
        
        // Atualizar quantidade de um item no carrinho
        updateCartItemQuantity: function(productId, quantity) {
            const item = appData.cart.find(item => item.productId === productId);
            if (item) {
                item.quantity = quantity;
            }
        },
        
        // Remover item do carrinho
        removeFromCart: function(productId) {
            appData.cart = appData.cart.filter(item => item.productId !== productId);
        },
        
        // Limpar carrinho
        clearCart: function() {
            appData.cart = [];
        },
        
        // Calcular total do carrinho
        getCartTotal: async function() {
            let total = 0;
            
            // Obter todos os produtos para calcular o total
            const products = await productManager.getProducts();
            
            for (const item of appData.cart) {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    total += product.price * item.quantity;
                }
            }
            
            return total;
        }
    };
    
    // Inicializar dados
    async function initializeData() {
        try {
            // Verificar se existem categorias
            const categories = await categoryManager.getCategories();
            
            if (categories.length === 0) {
                // Criar categorias iniciais
                await categoryManager.addCategory('Brigadeiros');
                await categoryManager.addCategory('Bolos');
                await categoryManager.addCategory('Doces Especiais');
                
                console.log('Categorias iniciais criadas');
            }
        } catch (error) {
            console.error('Erro ao inicializar dados:', error);
        }
    }
    
    // Inicializar dados se o usuário estiver autenticado
    auth.onAuthStateChanged(function(user) {
        if (user && user.email) {
            initializeData();
        }
    });
});
