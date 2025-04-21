// Módulo de administração com autenticação Firebase
document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminModal = document.getElementById('admin-login-modal');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminPanel = document.getElementById('admin-panel');
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    const adminCloseBtn = document.getElementById('admin-close-btn');
    const closeModalBtn = document.querySelector('.close');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const categoryForm = document.getElementById('category-form');
    const productForm = document.getElementById('product-form');
    const adminCategoryList = document.getElementById('admin-category-list');
    const adminProductList = document.getElementById('admin-product-list');
    const productCategorySelect = document.getElementById('product-category');
    const adminCategoriesLoading = document.getElementById('admin-categories-loading');
    const adminProductsLoading = document.getElementById('admin-products-loading');

    // Variáveis para controle de estado
    let adminCategoriesListener = null;
    let adminProductsListener = null;

    // Gerenciador de categorias
    const categoryManager = {
        async getCategories() {
            const snapshot = await window.appFirebase.categoriesRef.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        
        async addCategory(name) {
            const docRef = await window.appFirebase.categoriesRef.add({ name });
            return docRef.id;
        },
        
        async updateCategory(id, name) {
            await window.appFirebase.categoriesRef.doc(id).update({ name });
        },
        
        async deleteCategory(id) {
            // Primeiro, exclua todos os produtos associados a esta categoria
            const productsSnapshot = await window.appFirebase.productsRef.where('categoryId', '==', id).get();
            
            // Usar batch para excluir múltiplos documentos
            const batch = window.appFirebase.db.batch();
            productsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Excluir a categoria
            batch.delete(window.appFirebase.categoriesRef.doc(id));
            
            // Confirmar a operação em lote
            await batch.commit();
        }
    };

    // Gerenciador de produtos
    const productManager = {
        // Adicionar produto
        addProduct: async function (categoryId, name, description, price, imageUrl, available = true, hasFlavors = false, flavors = [], allowMultipleFlavors = false, flavorQuantity = 1) {
            try {
                const productData = {
                    categoryId,
                    name,
                    description,
                    price: parseFloat(price),
                    image: imageUrl || '',
                    available: available === true,
                    hasFlavors: hasFlavors === true,
                    allowMultipleFlavors: allowMultipleFlavors === true,
                    flavorQuantity: parseInt(flavorQuantity) || 1
                };
                
                if (hasFlavors && flavors.length > 0) {
                    productData.flavors = flavors;
                }
                
                const newProductRef = await window.appFirebase.addProduct(productData);
                
                if (newProductRef) {
                    return { id: newProductRef, ...productData };
                } else {
                    throw new Error("Falha ao adicionar produto.");
                }
            } catch (error) {
                console.error("Erro ao adicionar produto:", error);
                return false;
            }
        },
        
        // Atualizar produto
        updateProduct: async function (productId, categoryId, name, description, price, imageUrl, available = true, hasFlavors = false, flavors = [], allowMultipleFlavors = false, flavorQuantity = 1) {
            try {
                const productData = {
                    categoryId,
                    name,
                    description,
                    price: parseFloat(price),
                    image: imageUrl || '',
                    available: available === true,
                    hasFlavors: hasFlavors === true,
                    allowMultipleFlavors: allowMultipleFlavors === true,
                    flavorQuantity: parseInt(flavorQuantity) || 1
                };
                
                if (hasFlavors && flavors.length > 0) {
                    productData.flavors = flavors;
                }
                
                await window.appFirebase.updateProduct(productId, productData);
                return { id: productId, ...productData };
            } catch (error) {
                console.error("Erro ao atualizar produto:", error);
                return false;
            }
        },
        
        // Remover produto
        deleteProduct: async function (productId) {
            try {
                await window.appFirebase.deleteProduct(productId);
                return true;
            } catch (error) {
                console.error("Erro ao excluir produto:", error);
                return false;
            }
        },
        
        // Obter todos os produtos
        getProducts: async function () {
            try {
                const products = await window.appFirebase.getProducts();
                return products;
            } catch (error) {
                console.error("Erro ao obter produtos:", error);
                return [];
            }
        },
        
        // Obter produtos por categoria
        getProductsByCategory: async function (categoryId) {
            try {
                const products = await window.appFirebase.getProductsByCategory(categoryId);
                return products;
            } catch (error) {
                console.error(`Erro ao obter produtos da categoria ${categoryId}:`, error);
                return [];
            }
        }
    };

    // Fechar modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            adminModal.style.display = 'none';
        });
    }

    // Fechar modal ao clicar fora dele
    window.addEventListener('click', function(event) {
        if (event.target === adminModal) {
            adminModal.style.display = 'none';
        }
    });

    // Processar login
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const emailInput = document.getElementById('admin-email');
            const passwordInput = document.getElementById('admin-password');
            
            // Verificar se os elementos existem antes de acessar suas propriedades
            if (!emailInput || !passwordInput) {
                console.error('Elementos de email ou senha não encontrados no DOM');
                showNotification('Erro no formulário de login', 'error');
                return;
            }
            
            const email = emailInput.value;
            const password = passwordInput.value;
            
            // Mostrar indicador de carregamento
            const submitBtn = adminLoginForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
            submitBtn.disabled = true;
            
            window.appFirebase.auth.signInWithEmailAndPassword(email, password)
                .then(function(userCredential) {
                    // Login bem-sucedido
                    adminModal.style.display = 'none';
                    adminPanel.style.display = 'block';
                    emailInput.value = '';
                    passwordInput.value = '';
                    
                    // Carregar dados administrativos
                    loadAdminData();
                    
                    showNotification('Login realizado com sucesso!', 'success');
                })
                .catch(function(error) {
                    console.error('Erro no login:', error);
                    
                    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                        showNotification('Email ou senha incorretos', 'error');
                    } else if (error.code === 'auth/invalid-email') {
                        showNotification('Email inválido', 'error');
                    } else {
                        showNotification('Erro ao fazer login: ' + error.message, 'error');
                    }
                })
                .finally(function() {
                    // Restaurar botão
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                });
        });
    }

    // Logout
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', function() {
            window.appFirebase.auth.signOut()
                .then(function() {
                    adminPanel.style.display = 'none';
                    showNotification('Logout realizado com sucesso', 'success');
                    
                    // Cancelar listeners
                    if (adminCategoriesListener) {
                        adminCategoriesListener();
                    }
                    if (adminProductsListener) {
                        adminProductsListener();
                    }
                })
                .catch(function(error) {
                    console.error('Erro ao fazer logout:', error);
                    showNotification('Erro ao fazer logout', 'error');
                });
        });
    }

    // Alternar entre abas
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remover classe active de todos os botões e conteúdos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Adicionar classe active ao botão clicado e ao conteúdo correspondente
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });

    // Adicionar categoria
    if (categoryForm) {
        categoryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const categoryName = document.getElementById('category-name').value.trim();
            
            if (categoryName) {
                // Mostrar indicador de carregamento
                const submitBtn = categoryForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adicionando...';
                submitBtn.disabled = true;
                
                categoryManager.addCategory(categoryName)
                    .then(function(newCategory) {
                        if (newCategory) {
                            document.getElementById('category-name').value = '';
                            showNotification('Categoria adicionada com sucesso!', 'success');
                        }
                    })
                    .catch(function(error) {
                        console.error('Erro ao adicionar categoria:', error);
                        showNotification('Erro ao adicionar categoria', 'error');
                    })
                    .finally(function() {
                        // Restaurar botão
                        submitBtn.innerHTML = originalBtnText;
                        submitBtn.disabled = false;
                    });
            }
        });
    }

    // Adicionar produto
    if (productForm) {
        // Preview de imagem
        const productImageInput = document.getElementById('product-image');
        const imagePreview = document.getElementById('image-preview');
        const previewImg = document.getElementById('preview-img');

        productImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImg.src = e.target.result;
                    imagePreview.style.display = 'block';
                }
                reader.readAsDataURL(file);
            } else {
                imagePreview.style.display = 'none';
            }
        });

        // Adicionar campo de disponibilidade, se não existir
        if (!document.getElementById('product-available')) {
            const priceFormGroup = document.querySelector('#product-form .form-group:nth-child(4)');
            if (priceFormGroup) {
                const availableFormGroup = document.createElement('div');
                availableFormGroup.className = 'form-group';
                availableFormGroup.innerHTML = `
                    <label for="product-available">Disponibilidade:</label>
                    <select id="product-available">
                        <option value="true" selected>Disponível</option>
                        <option value="false">Indisponível</option>
                    </select>
                `;
                priceFormGroup.insertAdjacentElement('afterend', availableFormGroup);
            }
        }
        
        // Adicionar campos para gerenciamento de sabores, se não existirem
        if (!document.getElementById('product-has-flavors')) {
            const lastFormGroup = document.querySelector('#product-form .form-group:last-child');
            if (lastFormGroup) {
                // Criar container para opções de sabor
                const flavorContainer = document.createElement('div');
                flavorContainer.className = 'form-group flavor-options-container';
                
                flavorContainer.innerHTML = `
                    <div class="flavor-header">
                        <label for="product-has-flavors">Este produto tem opções de sabor?</label>
                        <select id="product-has-flavors">
                            <option value="false" selected>Não</option>
                            <option value="true">Sim</option>
                        </select>
                    </div>
                    
                    <div id="new-flavor-options-editor" style="display: none; margin-top: 15px;">
                        <p>Adicione as opções de sabor disponíveis:</p>
                        <div class="new-flavor-options-list"></div>
                        <button type="button" id="new-add-flavor-btn" class="secondary-btn" style="margin-top: 10px;">
                            <i class="fas fa-plus"></i> Adicionar Sabor
                        </button>
                        <p class="flavor-help-text" style="font-size: 0.8em; color: #666; margin-top: 10px;">
                            Para cada sabor, você pode definir um preço adicional. Use 0 se não houver acréscimo.
                        </p>
                    </div>
                `;
                
                lastFormGroup.insertAdjacentElement('beforebegin', flavorContainer);
                
                // Configurar o comportamento do gerenciador de sabores
                const hasFlavorSelect = document.getElementById('product-has-flavors');
                const flavorOptionsEditor = document.getElementById('new-flavor-options-editor');
                
                if (hasFlavorSelect && flavorOptionsEditor) {
                    hasFlavorSelect.addEventListener('change', function() {
                        flavorOptionsEditor.style.display = this.value === 'true' ? 'block' : 'none';
                    });
                }
                
                // Adicionar nova opção de sabor
                const addFlavorBtn = document.getElementById('new-add-flavor-btn');
                const flavorOptionsList = document.querySelector('.new-flavor-options-list');
                
                if (addFlavorBtn && flavorOptionsList) {
                    addFlavorBtn.addEventListener('click', function() {
                        const newIndex = flavorOptionsList.querySelectorAll('.flavor-option').length;
                        const newFlavorOption = document.createElement('div');
                        newFlavorOption.className = 'flavor-option';
                        newFlavorOption.setAttribute('data-index', newIndex);
                        newFlavorOption.innerHTML = `
                            <div class="flavor-option-row">
                                <input type="text" class="flavor-name" placeholder="Nome do sabor" />
                                <input type="number" class="flavor-price" placeholder="Preço adicional" step="0.01" min="0" value="0" />
                                <button type="button" class="remove-flavor-btn"><i class="fas fa-trash"></i></button>
                            </div>
                        `;
                        flavorOptionsList.appendChild(newFlavorOption);
                        
                        // Adicionar event listener para o botão de remover
                        const removeBtn = newFlavorOption.querySelector('.remove-flavor-btn');
                        if (removeBtn) {
                            removeBtn.addEventListener('click', function() {
                                flavorOptionsList.removeChild(newFlavorOption);
                            });
                        }
                    });
                }
            }
        }

        productForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const categoryId = document.getElementById('product-category').value;
            const name = document.getElementById('product-name').value.trim();
            const description = document.getElementById('product-description').value.trim();
            const price = document.getElementById('product-price').value;
            const imageFile = document.getElementById('product-image').files[0];
            const available = document.getElementById('product-available') ? 
                document.getElementById('product-available').value === 'true' : true;
            const hasFlavors = document.getElementById('product-has-flavors') ?
                document.getElementById('product-has-flavors').value === 'true' : false;
            
            // Coletar opções de sabor
            const flavors = [];
            if (hasFlavors) {
                document.querySelectorAll('.new-flavor-options-list .flavor-option').forEach(option => {
                    const nameInput = option.querySelector('.flavor-name');
                    const priceInput = option.querySelector('.flavor-price');
                    
                    if (nameInput && nameInput.value.trim()) {
                        flavors.push({
                            name: nameInput.value.trim(),
                            extraPrice: parseFloat(priceInput.value || 0)
                        });
                    }
                });
            }
            
            if (categoryId && name && price) {
                // Mostrar indicador de carregamento
                const submitBtn = productForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adicionando...';
                submitBtn.disabled = true;
                
                try {
                    // Fazer upload da imagem se houver
                    let imageUrl = '';
                    if (imageFile) {
                        imageUrl = await window.appFirebase.uploadProductImage(imageFile);
                    }
                    
                    // Criar objeto do produto
                    const productData = {
                        categoryId,
                        name,
                        description: description || '',
                        price: parseFloat(price),
                        image: imageUrl,
                        available,
                        hasFlavors,
                        flavors
                    };
                    
                    // Adicionar produto
                    const newProductId = await window.appFirebase.productsRef.add({
                        ...productData,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    if (newProductId) {
                        // Limpar formulário
                        productForm.reset();
                        
                        // Resetar UI
                        imagePreview.style.display = 'none';
                        
                        if (document.getElementById('new-flavor-options-editor')) {
                            document.getElementById('new-flavor-options-editor').style.display = 'none';
                        }
                        
                        if (document.querySelector('.new-flavor-options-list')) {
                            document.querySelector('.new-flavor-options-list').innerHTML = '';
                        }
                        
                        if (document.getElementById('product-has-flavors')) {
                            document.getElementById('product-has-flavors').value = 'false';
                        }
                        
                        showNotification('Produto adicionado com sucesso!', 'success');
                    }
                } catch (error) {
                    console.error('Erro ao adicionar produto:', error);
                    showNotification('Erro ao adicionar produto', 'error');
                } finally {
                    // Restaurar botão
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                }
            } else {
                showNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
            }
        });
    }

    // Carregar dados administrativos
    function loadAdminData() {
        // Carregar categorias para o select de produtos
        loadCategoriesForSelect();
        
        // Iniciar sincronização em tempo real para categorias
        startCategoriesSync();
        
        // Iniciar sincronização em tempo real para produtos
        startProductsSync();
    }

    // Iniciar sincronização em tempo real para categorias
    function startCategoriesSync() {
        // Cancelar listener anterior se existir
        if (adminCategoriesListener) {
            adminCategoriesListener();
        }
        
        // Mostrar indicador de carregamento
        if (adminCategoriesLoading) {
            adminCategoriesLoading.style.display = 'block';
        }
        
        // Iniciar novo listener
        adminCategoriesListener = window.appFirebase.categoriesRef.orderBy('name').onSnapshot(snapshot => {
            const categories = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            loadCategoryList(categories);
            loadCategoriesForSelect();
            
            // Ocultar indicador de carregamento
            if (adminCategoriesLoading) {
                adminCategoriesLoading.style.display = 'none';
            }
        }, error => {
            console.error('Erro ao sincronizar categorias:', error);
            showNotification('Erro ao carregar categorias', 'error');
            
            // Ocultar indicador de carregamento
            if (adminCategoriesLoading) {
                adminCategoriesLoading.style.display = 'none';
                adminCategoriesLoading.innerHTML = '<p class="error-message">Erro ao carregar categorias</p>';
            }
        });
    }

    // Iniciar sincronização em tempo real para produtos
    function startProductsSync() {
        // Cancelar listener anterior se existir
        if (adminProductsListener) {
            adminProductsListener();
        }
        
        // Mostrar indicador de carregamento
        if (adminProductsLoading) {
            adminProductsLoading.style.display = 'block';
        }
        
        // Iniciar novo listener
        adminProductsListener = window.appFirebase.productsRef.orderBy('name').onSnapshot(snapshot => {
            const products = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            loadProductList(products);
            
            // Ocultar indicador de carregamento
            if (adminProductsLoading) {
                adminProductsLoading.style.display = 'none';
            }
        }, error => {
            console.error('Erro ao sincronizar produtos:', error);
            showNotification('Erro ao carregar produtos', 'error');
            
            // Ocultar indicador de carregamento
            if (adminProductsLoading) {
                adminProductsLoading.style.display = 'none';
                adminProductsLoading.innerHTML = '<p class="error-message">Erro ao carregar produtos</p>';
            }
        });
    }

    // Carregar categorias para o select de produtos
    function loadCategoriesForSelect() {
        if (!productCategorySelect) return;
        
        // Salvar valor selecionado atual
        const currentValue = productCategorySelect.value;
        
        // Limpar select
        productCategorySelect.innerHTML = '';
        
        // Obter categorias
        categoryManager.getCategories()
            .then(categories => {
                if (categories.length === 0) {
                    productCategorySelect.innerHTML = '<option value="">Nenhuma categoria disponível</option>';
                    return;
                }
                
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    productCategorySelect.appendChild(option);
                });
                
                // Restaurar valor selecionado se ainda existir
                if (currentValue) {
                    const exists = Array.from(productCategorySelect.options).some(option => option.value === currentValue);
                    if (exists) {
                        productCategorySelect.value = currentValue;
                    }
                }
            })
            .catch(error => {
                console.error('Erro ao carregar categorias para select:', error);
                productCategorySelect.innerHTML = '<option value="">Erro ao carregar categorias</option>';
            });
    }

    // Carregar lista de categorias
    function loadCategoryList(categories) {
        if (!adminCategoryList) return;
        
        adminCategoryList.innerHTML = '';
        
        if (categories.length === 0) {
            adminCategoryList.innerHTML = '<li class="empty-list">Nenhuma categoria cadastrada</li>';
            return;
        }
        
        categories.forEach(category => {
            const li = document.createElement('li');
            
            const categoryName = document.createElement('span');
            categoryName.textContent = category.name;
            li.appendChild(categoryName);
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'admin-actions';
            
            const editBtn = document.createElement('button');
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.className = 'edit-btn';
            editBtn.title = 'Editar categoria';
            editBtn.addEventListener('click', function() {
                editCategory(category);
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.className = 'delete-btn';
            deleteBtn.title = 'Excluir categoria';
            deleteBtn.addEventListener('click', function() {
                confirmDeleteCategory(category);
            });
            
            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);
            li.appendChild(actionsDiv);
            
            adminCategoryList.appendChild(li);
        });
    }

    // Editar categoria
    function editCategory(category) {
        const newName = prompt('Editar nome da categoria:', category.name);
        if (newName !== null && newName.trim() !== '') {
            categoryManager.updateCategory(category.id, newName.trim())
                .then(function(success) {
                    if (success) {
                        showNotification('Categoria atualizada com sucesso!', 'success');
                    }
                })
                .catch(function(error) {
                    console.error('Erro ao atualizar categoria:', error);
                    showNotification('Erro ao atualizar categoria', 'error');
                });
        }
    }

    // Confirmar exclusão de categoria
    function confirmDeleteCategory(category) {
        if (confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)) {
            categoryManager.deleteCategory(category.id)
                .then(function(result) {
                    if (result.success) {
                        showNotification('Categoria excluída com sucesso!', 'success');
                    } else {
                        showNotification(result.message, 'error');
                    }
                })
                .catch(function(error) {
                    console.error('Erro ao excluir categoria:', error);
                    showNotification('Erro ao excluir categoria', 'error');
                });
        }
    }

    // Carregar lista de produtos
    function loadProductList(products) {
        if (!adminProductList) return;
        
        adminProductList.innerHTML = '';
        
        if (products.length === 0) {
            adminProductList.innerHTML = '<div class="empty-message">Nenhum produto cadastrado</div>';
            return;
        }
        
        // Obter todas as categorias
        categoryManager.getCategories()
            .then(categories => {
                // Agrupar produtos por categoria
                const productsByCategory = {};
                
                products.forEach(product => {
                    const categoryId = product.categoryId;
                    if (!productsByCategory[categoryId]) {
                        productsByCategory[categoryId] = [];
                    }
                    productsByCategory[categoryId].push(product);
                });
                
                // Criar seções para cada categoria
                categories.forEach(category => {
                    if (productsByCategory[category.id] && productsByCategory[category.id].length > 0) {
                        // Criar cabeçalho da categoria
                        const categoryHeader = document.createElement('div');
                        categoryHeader.className = 'admin-category-header';
                        categoryHeader.innerHTML = `<h3>${category.name}</h3>`;
                        adminProductList.appendChild(categoryHeader);
                        
                        // Criar container para produtos desta categoria
                        const categoryProducts = document.createElement('div');
                        categoryProducts.className = 'admin-category-products';
                        
                        // Adicionar produtos
                        productsByCategory[category.id].forEach(product => {
                            const productCard = createProductCard(product, category);
                            categoryProducts.appendChild(productCard);
                        });
                        
                        adminProductList.appendChild(categoryProducts);
                    }
                });
                
                // Verificar se há produtos sem categoria válida
                const unknownProducts = products.filter(product => 
                    !categories.some(category => category.id === product.categoryId)
                );
                
                if (unknownProducts.length > 0) {
                    // Criar seção para produtos sem categoria válida
                    const unknownHeader = document.createElement('div');
                    unknownHeader.className = 'admin-category-header';
                    unknownHeader.innerHTML = `<h3>Categoria Desconhecida</h3>`;
                    adminProductList.appendChild(unknownHeader);
                    
                    const unknownProductsContainer = document.createElement('div');
                    unknownProductsContainer.className = 'admin-category-products';
                    
                    unknownProducts.forEach(product => {
                        const productCard = createProductCard(product, { name: 'Desconhecida' });
                        unknownProductsContainer.appendChild(productCard);
                    });
                    
                    adminProductList.appendChild(unknownProductsContainer);
                }
            })
            .catch(error => {
                console.error('Erro ao carregar categorias para produtos:', error);
                adminProductList.innerHTML = '<div class="error-message">Erro ao carregar produtos</div>';
            });
    }

    // Criar card de produto
    function createProductCard(product, category) {
        const productCard = document.createElement('div');
        productCard.className = 'admin-product-card';
        
        // Adicionar classe para produtos indisponíveis
        if (product.available === false) {
            productCard.classList.add('unavailable');
        }
        
        // Imagem padrão para casos sem imagem
        const defaultImage = '/mapeju_firebase/img/default-product.png';
        
        // Criar elemento de imagem com loading
        const imageContainer = document.createElement('div');
        imageContainer.className = 'admin-product-image';
        
        const imageElement = document.createElement('img');
        imageElement.alt = product.name;
        imageElement.className = 'product-image loading';
        
        // Verificar se a imagem é uma referência ao Firestore
        if (product.image && product.image.startsWith('firestore-image://')) {
            // Carregar imagem do Firestore
            window.appFirebase.loadProductImage(product.image)
                .then(dataUrl => {
                    imageElement.src = dataUrl;
                    imageElement.classList.remove('loading');
                })
                .catch(error => {
                    console.error('Erro ao carregar imagem:', error);
                    imageElement.src = defaultImage;
                    imageElement.classList.remove('loading');
                });
        } else {
            // URL normal ou sem imagem
            imageElement.src = product.image || defaultImage;
            imageElement.classList.remove('loading');
        }
        
        // Configurar fallback para erro de carregamento
        imageElement.onerror = function() {
            this.src = defaultImage;
            this.classList.remove('loading');
        };
        
        imageContainer.appendChild(imageElement);
        
        // Status de disponibilidade
        const availableStatus = product.available !== false;
        const statusText = availableStatus ? 'Disponível' : 'Indisponível';
        const statusClass = availableStatus ? 'available' : 'unavailable';
        const toggleIcon = availableStatus ? 'fa-toggle-on' : 'fa-toggle-off';
        
        productCard.innerHTML = `
            <div class="admin-product-info">
                <h4>${product.name}</h4>
                <p class="admin-product-category"><strong>Categoria:</strong> ${category.name}</p>
                <p class="admin-product-price"><strong>Preço:</strong> R$ ${parseFloat(product.price).toFixed(2)}</p>
                <p class="admin-product-description"><strong>Descrição:</strong> ${product.description || 'Sem descrição'}</p>
                <p class="admin-product-status"><strong>Status:</strong> <span class="status-badge ${statusClass}">${statusText}</span></p>
                <div class="admin-product-actions">
                    <button class="toggle-btn" title="Alternar disponibilidade"><i class="fas ${toggleIcon}"></i></button>
                    <button class="edit-btn" title="Editar produto"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" title="Excluir produto"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
        
        // Inserir container de imagem no início do card
        productCard.insertBefore(imageContainer, productCard.firstChild);
        
        // Adicionar event listeners para os botões
        const toggleBtn = productCard.querySelector('.toggle-btn');
        toggleBtn.addEventListener('click', function() {
            // Alternar disponibilidade do produto
            productManager.toggleAvailability(product.id, availableStatus)
                .then(() => {
                    showNotification(`Produto ${availableStatus ? 'indisponibilizado' : 'disponibilizado'} com sucesso!`, 'success');
                })
                .catch(error => {
                    console.error('Erro ao alternar disponibilidade:', error);
                    showNotification('Erro ao alternar disponibilidade do produto', 'error');
                });
        });
        
        const editBtn = productCard.querySelector('.edit-btn');
        editBtn.addEventListener('click', function() {
            editProduct(product);
        });
        
        const deleteBtn = productCard.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            confirmDeleteProduct(product);
        });
        
        return productCard;
    }

    // Editar produto
    function editProduct(product) {
        // Obter categorias para o formulário
        categoryManager.getCategories()
            .then(categories => {
                // Criar opções de categorias
                let categoryOptions = '';
                categories.forEach(category => {
                    categoryOptions += `<option value="${category.id}" ${category.id === product.categoryId ? 'selected' : ''}>${category.name}</option>`;
                });
                
                // Verificar disponibilidade (garantir valor booleano)
                const isAvailable = product.available !== false;
                
                // Verificar se produto tem opções de sabor
                const hasFlavors = product.hasFlavors === true;
                
                // Verificar se permite múltiplas seleções
                const allowMultipleFlavors = product.allowMultipleFlavors === true;
                
                // Quantidade de sabores (para kits)
                const flavorQuantity = product.flavorQuantity || 1;
                
                // Preparar as opções de sabor existentes
                const flavors = product.flavors || [];
                let flavorOptionsHtml = '';
                
                flavors.forEach((flavor, index) => {
                    flavorOptionsHtml += `
                        <div class="flavor-option" data-index="${index}">
                            <div class="flavor-option-row">
                                <input type="text" class="flavor-name" placeholder="Nome do sabor" value="${flavor.name || ''}" />
                                <input type="number" class="flavor-price" placeholder="Preço adicional" step="0.01" min="0" value="${flavor.extraPrice || 0}" />
                                <button type="button" class="remove-flavor-btn"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `;
                });
                
                // Criar um formulário modal para edição
                const editForm = document.createElement('form');
                editForm.className = 'edit-product-form';
                
                // Adicionar preview da imagem atual se existir
                const currentImageHtml = product.image ? 
                    `<div class="current-image" style="margin-bottom: 15px;">
                        <p>Imagem atual:</p>
                        <img src="${product.image}" alt="${product.name}" style="max-width: 200px; max-height: 200px;">
                    </div>` : '';
                
                editForm.innerHTML = `
                    <h3>Editar Produto</h3>
                    ${currentImageHtml}
                    <div class="form-group">
                        <label for="edit-product-category">Categoria:</label>
                        <select id="edit-product-category" required>
                            ${categoryOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="edit-product-name">Nome do Produto:</label>
                        <input type="text" id="edit-product-name" value="${product.name}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-product-description">Descrição:</label>
                        <textarea id="edit-product-description" rows="3">${product.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="edit-product-price">Preço (R$):</label>
                        <input type="number" id="edit-product-price" step="0.01" min="0" value="${product.price}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-product-available">Disponibilidade:</label>
                        <select id="edit-product-available">
                            <option value="true" ${isAvailable ? 'selected' : ''}>Disponível</option>
                            <option value="false" ${!isAvailable ? 'selected' : ''}>Indisponível</option>
                        </select>
                    </div>
                    <div class="form-group flavor-options-container">
                        <div class="flavor-header">
                            <label for="edit-product-has-flavors">Este produto tem opções de sabor?</label>
                            <select id="edit-product-has-flavors">
                                <option value="true" ${hasFlavors ? 'selected' : ''}>Sim</option>
                                <option value="false" ${!hasFlavors ? 'selected' : ''}>Não</option>
                            </select>
                        </div>
                        
                        <div id="flavor-options-editor" style="display: ${hasFlavors ? 'block' : 'none'}; margin-top: 15px;">
                            <div class="form-group multiple-flavors-option">
                                <label for="edit-product-multiple-flavors">Este produto permite múltiplos sabores? (ex: Kit com vários itens)</label>
                                <select id="edit-product-multiple-flavors">
                                    <option value="true" ${allowMultipleFlavors ? 'selected' : ''}>Sim</option>
                                    <option value="false" ${!allowMultipleFlavors ? 'selected' : ''}>Não</option>
                                </select>
                            </div>
                            
                            <div id="flavor-quantity-container" style="display: ${allowMultipleFlavors ? 'block' : 'none'}; margin-top: 10px;" class="form-group">
                                <label for="edit-flavor-quantity">Quantidade de sabores que o cliente deve escolher:</label>
                                <input type="number" id="edit-flavor-quantity" min="1" max="10" value="${flavorQuantity}" />
                                <p class="flavor-help-text" style="font-size: 0.8em; color: #666; margin-top: 5px;">
                                    Ex: Para um kit com 4 brigadeiros, defina como 4 para que o cliente escolha exatamente 4 sabores.
                                </p>
                            </div>
                            
                            <p>Adicione as opções de sabor disponíveis:</p>
                            <div class="flavor-options-list">
                                ${flavorOptionsHtml}
                            </div>
                            <button type="button" id="add-flavor-btn" class="secondary-btn" style="margin-top: 10px;">
                                <i class="fas fa-plus"></i> Adicionar Sabor
                            </button>
                            <p class="flavor-help-text" style="font-size: 0.8em; color: #666; margin-top: 10px;">
                                Para cada sabor, você pode definir um preço adicional. Use 0 se não houver acréscimo.
                            </p>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="edit-product-image">Nova imagem (opcional):</label>
                        <input type="file" id="edit-product-image" accept="image/*">
                        <div id="edit-image-preview" style="margin-top: 10px; max-width: 200px; display: none;">
                            <img id="edit-preview-img" style="width: 100%; height: auto;" />
                        </div>
                    </div>
                    <div class="form-buttons">
                        <button type="submit" class="primary-btn">Salvar Alterações</button>
                        <button type="button" class="secondary-btn" id="cancel-edit">Cancelar</button>
                    </div>
                `;
                
                // Criar modal
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.style.display = 'block';
                
                const modalContent = document.createElement('div');
                modalContent.className = 'modal-content';
                modalContent.appendChild(editForm);
                modal.appendChild(modalContent);
                
                document.body.appendChild(modal);
                
                // Preview da nova imagem
                const editImageInput = document.getElementById('edit-product-image');
                const editImagePreview = document.getElementById('edit-image-preview');
                const editPreviewImg = document.getElementById('edit-preview-img');
                
                if (editImageInput) {
                    editImageInput.addEventListener('change', function(e) {
                        const file = e.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = function(e) {
                                editPreviewImg.src = e.target.result;
                                editImagePreview.style.display = 'block';
                            }
                            reader.readAsDataURL(file);
                        } else {
                            editImagePreview.style.display = 'none';
                        }
                    });
                }
                
                // Gerenciar visibilidade do editor de sabores
                const hasFlavorSelect = document.getElementById('edit-product-has-flavors');
                const flavorOptionsEditor = document.getElementById('flavor-options-editor');
                
                if (hasFlavorSelect && flavorOptionsEditor) {
                    hasFlavorSelect.addEventListener('change', function() {
                        flavorOptionsEditor.style.display = this.value === 'true' ? 'block' : 'none';
                    });
                }
                
                // Gerenciar visibilidade da opção de quantidade de sabores
                const multipleFlavorSelect = document.getElementById('edit-product-multiple-flavors');
                const flavorQuantityContainer = document.getElementById('flavor-quantity-container');
                
                if (multipleFlavorSelect && flavorQuantityContainer) {
                    multipleFlavorSelect.addEventListener('change', function() {
                        flavorQuantityContainer.style.display = this.value === 'true' ? 'block' : 'none';
                    });
                }
                
                // Adicionar nova opção de sabor
                const addFlavorBtn = document.getElementById('add-flavor-btn');
                const flavorOptionsList = document.querySelector('.flavor-options-list');
                
                if (addFlavorBtn && flavorOptionsList) {
                    addFlavorBtn.addEventListener('click', function() {
                        const newIndex = document.querySelectorAll('.flavor-option').length;
                        const newFlavorOption = document.createElement('div');
                        newFlavorOption.className = 'flavor-option';
                        newFlavorOption.setAttribute('data-index', newIndex);
                        newFlavorOption.innerHTML = `
                            <div class="flavor-option-row">
                                <input type="text" class="flavor-name" placeholder="Nome do sabor" />
                                <input type="number" class="flavor-price" placeholder="Preço adicional" step="0.01" min="0" value="0" />
                                <button type="button" class="remove-flavor-btn"><i class="fas fa-trash"></i></button>
                            </div>
                        `;
                        flavorOptionsList.appendChild(newFlavorOption);
                        
                        // Adicionar event listener para o botão de remover
                        newFlavorOption.querySelector('.remove-flavor-btn').addEventListener('click', function() {
                            flavorOptionsList.removeChild(newFlavorOption);
                        });
                    });
                }
                
                // Adicionar event listeners para os botões de remover opção existentes
                document.querySelectorAll('.remove-flavor-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const flavorOption = this.closest('.flavor-option');
                        if (flavorOption) {
                            flavorOptionsList.removeChild(flavorOption);
                        }
                    });
                });
                
                // Cancelar edição
                document.getElementById('cancel-edit').addEventListener('click', function() {
                    document.body.removeChild(modal);
                });
                
                // Fechar modal ao clicar fora dele
                modal.addEventListener('click', function(event) {
                    if (event.target === modal) {
                        document.body.removeChild(modal);
                    }
                });
                
                // Processar formulário de edição
                editForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const categoryId = document.getElementById('edit-product-category').value;
                    const name = document.getElementById('edit-product-name').value.trim();
                    const description = document.getElementById('edit-product-description').value.trim();
                    const price = document.getElementById('edit-product-price').value;
                    const available = document.getElementById('edit-product-available').value === 'true';
                    const hasFlavors = document.getElementById('edit-product-has-flavors').value === 'true';
                    const allowMultipleFlavors = document.getElementById('edit-product-multiple-flavors')?.value === 'true' || false;
                    const flavorQuantity = parseInt(document.getElementById('edit-flavor-quantity')?.value || '1');
                    const imageFile = document.getElementById('edit-product-image').files[0];
                    
                    // Coletar opções de sabor
                    const flavors = [];
                    if (hasFlavors) {
                        document.querySelectorAll('.flavor-option').forEach(option => {
                            const nameInput = option.querySelector('.flavor-name');
                            const priceInput = option.querySelector('.flavor-price');
                            
                            if (nameInput && nameInput.value.trim()) {
                                flavors.push({
                                    name: nameInput.value.trim(),
                                    extraPrice: parseFloat(priceInput.value || 0)
                                });
                            }
                        });
                    }
                    
                    if (categoryId && name && price) {
                        // Mostrar indicador de carregamento
                        const submitBtn = editForm.querySelector('button[type="submit"]');
                        const originalBtnText = submitBtn.innerHTML;
                        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
                        submitBtn.disabled = true;
                        
                        try {
                            // Se tiver um novo arquivo de imagem, fazer upload
                            let imageUrl = product.image; // Manter URL atual por padrão
                            if (imageFile) {
                                imageUrl = await window.appFirebase.uploadProductImage(imageFile);
                            }
                            
                            // Atualizar produto
                            const success = await productManager.updateProduct(
                                product.id, categoryId, name, description, price, imageUrl, available, hasFlavors, flavors, allowMultipleFlavors, flavorQuantity
                            );
                            
                            if (success !== false) {
                                document.body.removeChild(modal);
                                showNotification('Produto atualizado com sucesso!', 'success');
                            }
                        } catch (error) {
                            console.error('Erro ao atualizar produto:', error);
                            showNotification('Erro ao atualizar produto', 'error');
                        } finally {
                            // Restaurar botão
                            submitBtn.innerHTML = originalBtnText;
                            submitBtn.disabled = false;
                        }
                    } else {
                        showNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
                    }
                });
            })
            .catch(error => {
                console.error('Erro ao carregar categorias para edição:', error);
                showNotification('Erro ao carregar categorias', 'error');
            });
    }

    // Confirmar exclusão de produto
    function confirmDeleteProduct(product) {
        if (confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) {
            productManager.deleteProduct(product.id)
                .then(function(success) {
                    if (success) {
                        showNotification('Produto excluído com sucesso!', 'success');
                    } else {
                        showNotification('Erro ao excluir produto.', 'error');
                    }
                })
                .catch(function(error) {
                    console.error('Erro ao excluir produto:', error);
                    showNotification('Erro ao excluir produto', 'error');
                });
        }
    }

    // Verificar estado de autenticação
    window.appFirebase.auth.onAuthStateChanged(function(user) {
        if (user) {
            // Usuário está logado
            if (adminPanel) {
                // Mostrar email do usuário
                const adminUserEmail = document.getElementById('admin-user-email');
                if (adminUserEmail) {
                    adminUserEmail.textContent = user.email;
                }
                
                // Carregar dados administrativos
                loadAdminData();
            }
            
            // Configurar botão de login para abrir painel diretamente
            if (adminLoginBtn) {
                adminLoginBtn.addEventListener('click', function() {
                    if (adminPanel) {
                        adminPanel.style.display = 'block';
                    }
                });
            }
        } else {
            // Usuário não está logado
            if (adminPanel) {
                adminPanel.style.display = 'none';
            }
            
            // Configurar botão de login para abrir modal
            if (adminLoginBtn) {
                adminLoginBtn.addEventListener('click', function() {
                    if (adminModal) {
                        adminModal.style.display = 'block';
                    }
                });
            }
        }
    });

    // Função para renderizar imagem do produto
    function renderProductImage(imageUrl) {
        const defaultImage = '/mapeju_firebase/img/default-product.png';
        const imageElement = document.createElement('img');
        imageElement.className = 'product-image';
        imageElement.src = imageUrl || defaultImage;
        imageElement.onerror = function() {
            this.src = defaultImage;
        };
        return imageElement;
    }

    // Botão Voltar ao Cardápio
    if (adminCloseBtn) {
        adminCloseBtn.addEventListener('click', function() {
            if (adminPanel) {
                adminPanel.style.display = 'none';
            }
        });
    }
});
