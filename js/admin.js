// Módulo de administração com autenticação Firebase
document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminModal = document.getElementById('admin-modal');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminPanel = document.getElementById('admin-panel');
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
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
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Mostrar indicador de carregamento
            const submitBtn = adminLoginForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
            submitBtn.disabled = true;
            
            auth.signInWithEmailAndPassword(email, password)
                .then(function(userCredential) {
                    // Login bem-sucedido
                    adminModal.style.display = 'none';
                    adminPanel.style.display = 'block';
                    document.getElementById('email').value = '';
                    document.getElementById('password').value = '';
                    
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
            auth.signOut()
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
        productForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const categoryId = document.getElementById('product-category').value;
            const name = document.getElementById('product-name').value.trim();
            const description = document.getElementById('product-description').value.trim();
            const price = document.getElementById('product-price').value;
            const image = document.getElementById('product-image').value.trim();
            
            if (categoryId && name && price) {
                // Mostrar indicador de carregamento
                const submitBtn = productForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adicionando...';
                submitBtn.disabled = true;
                
                productManager.addProduct(categoryId, name, description, price, image)
                    .then(function(newProduct) {
                        if (newProduct) {
                            // Limpar formulário
                            document.getElementById('product-name').value = '';
                            document.getElementById('product-description').value = '';
                            document.getElementById('product-price').value = '';
                            document.getElementById('product-image').value = '';
                            
                            showNotification('Produto adicionado com sucesso!', 'success');
                        }
                    })
                    .catch(function(error) {
                        console.error('Erro ao adicionar produto:', error);
                        showNotification('Erro ao adicionar produto', 'error');
                    })
                    .finally(function() {
                        // Restaurar botão
                        submitBtn.innerHTML = originalBtnText;
                        submitBtn.disabled = false;
                    });
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
        adminCategoriesListener = categoriesRef.orderBy('name').onSnapshot(snapshot => {
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
        adminProductsListener = productsRef.orderBy('name').onSnapshot(snapshot => {
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
        
        // Verificar se a imagem existe
        const imageUrl = product.image || 'img/default-product.jpg';
        
        let imageHtml = '';
        if (imageUrl) {
            imageHtml = `
                <div class="admin-product-image">
                    <img src="${imageUrl}" alt="${product.name}" onerror="this.onerror=null; this.src='img/default-product.jpg'">
                </div>
            `;
        }
        
        productCard.innerHTML = `
            ${imageHtml}
            <div class="admin-product-info">
                <h4>${product.name}</h4>
                <p class="admin-product-category"><strong>Categoria:</strong> ${category.name}</p>
                <p class="admin-product-price"><strong>Preço:</strong> R$ ${parseFloat(product.price).toFixed(2)}</p>
                <p class="admin-product-description"><strong>Descrição:</strong> ${product.description || 'Sem descrição'}</p>
                <div class="admin-product-actions">
                    <button class="edit-btn" title="Editar produto"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" title="Excluir produto"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
        
        // Adicionar event listeners para os botões
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
                
                // Criar um formulário modal para edição
                const editForm = document.createElement('form');
                editForm.className = 'edit-product-form';
                
                editForm.innerHTML = `
                    <h3>Editar Produto</h3>
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
                        <label for="edit-product-image">URL da Imagem:</label>
                        <input type="text" id="edit-product-image" value="${product.image || ''}">
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
                editForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    
                    const categoryId = document.getElementById('edit-product-category').value;
                    const name = document.getElementById('edit-product-name').value.trim();
                    const description = document.getElementById('edit-product-description').value.trim();
                    const price = document.getElementById('edit-product-price').value;
                    const image = document.getElementById('edit-product-image').value.trim();
                    
                    if (categoryId && name && price) {
                        // Mostrar indicador de carregamento
                        const submitBtn = editForm.querySelector('button[type="submit"]');
                        const originalBtnText = submitBtn.innerHTML;
                        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
                        submitBtn.disabled = true;
                        
                        productManager.updateProduct(product.id, categoryId, name, description, price, image)
                            .then(function(success) {
                                if (success) {
                                    document.body.removeChild(modal);
                                    showNotification('Produto atualizado com sucesso!', 'success');
                                }
                            })
                            .catch(function(error) {
                                console.error('Erro ao atualizar produto:', error);
                                showNotification('Erro ao atualizar produto', 'error');
                            })
                            .finally(function() {
                                // Restaurar botão
                                submitBtn.innerHTML = originalBtnText;
                                submitBtn.disabled = false;
                            });
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
    auth.onAuthStateChanged(function(user) {
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
});
