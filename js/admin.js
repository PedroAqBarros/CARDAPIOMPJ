// Funções para o painel administrativo
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

    // Senha administrativa (em um sistema real, isso seria verificado no servidor)
    const ADMIN_PASSWORD = 'mapeju2025';

    // Abrir modal de login
    adminLoginBtn.addEventListener('click', function() {
        adminModal.style.display = 'block';
    });

    // Fechar modal
    closeModalBtn.addEventListener('click', function() {
        adminModal.style.display = 'none';
    });

    // Fechar modal ao clicar fora dele
    window.addEventListener('click', function(event) {
        if (event.target === adminModal) {
            adminModal.style.display = 'none';
        }
    });

    // Processar login
    adminLoginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const password = document.getElementById('password').value;
        
        if (password === ADMIN_PASSWORD) {
            adminModal.style.display = 'none';
            adminPanel.style.display = 'block';
            document.getElementById('password').value = '';
            
            // Carregar dados administrativos
            loadAdminData();
        } else {
            alert('Senha incorreta!');
        }
    });

    // Logout
    adminLogoutBtn.addEventListener('click', function() {
        adminPanel.style.display = 'none';
    });

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
    categoryForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const categoryName = document.getElementById('category-name').value.trim();
        
        if (categoryName) {
            addCategory(categoryName);
            document.getElementById('category-name').value = '';
            loadAdminData();
            
            // Feedback visual
            showAdminNotification('Categoria adicionada com sucesso!', 'success');
        }
    });

    // Adicionar produto
    productForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const categoryId = document.getElementById('product-category').value;
        const name = document.getElementById('product-name').value.trim();
        const description = document.getElementById('product-description').value.trim();
        const price = document.getElementById('product-price').value;
        const image = document.getElementById('product-image').value.trim();
        
        if (categoryId && name && price) {
            addProduct(categoryId, name, description, price, image);
            
            // Limpar formulário
            document.getElementById('product-name').value = '';
            document.getElementById('product-description').value = '';
            document.getElementById('product-price').value = '';
            document.getElementById('product-image').value = '';
            
            loadAdminData();
            
            // Feedback visual
            showAdminNotification('Produto adicionado com sucesso!', 'success');
        } else {
            showAdminNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
        }
    });

    // Mostrar notificação administrativa
    function showAdminNotification(message, type = 'info') {
        // Verificar se já existe uma notificação
        let notification = document.querySelector('.admin-notification');
        
        if (notification) {
            // Remover notificação existente
            notification.remove();
        }
        
        // Criar nova notificação
        notification = document.createElement('div');
        notification.className = `admin-notification ${type}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        
        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        // Adicionar ao painel administrativo
        adminPanel.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }

    // Carregar dados administrativos
    function loadAdminData() {
        // Carregar categorias para o select de produtos
        loadCategoriesForSelect();
        
        // Carregar lista de categorias
        loadCategoryList();
        
        // Carregar lista de produtos
        loadProductList();
    }

    // Carregar categorias para o select de produtos
    function loadCategoriesForSelect() {
        productCategorySelect.innerHTML = '';
        
        if (appData.categories.length === 0) {
            productCategorySelect.innerHTML = '<option value="">Nenhuma categoria disponível</option>';
            return;
        }
        
        appData.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            productCategorySelect.appendChild(option);
        });
    }

    // Carregar lista de categorias
    function loadCategoryList() {
        adminCategoryList.innerHTML = '';
        
        if (appData.categories.length === 0) {
            adminCategoryList.innerHTML = '<li class="empty-list">Nenhuma categoria cadastrada</li>';
            return;
        }
        
        appData.categories.forEach(category => {
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
            updateCategory(category.id, newName.trim());
            loadAdminData();
            showAdminNotification('Categoria atualizada com sucesso!', 'success');
        }
    }

    // Confirmar exclusão de categoria
    function confirmDeleteCategory(category) {
        if (confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)) {
            const result = deleteCategory(category.id);
            if (result.success) {
                loadAdminData();
                showAdminNotification('Categoria excluída com sucesso!', 'success');
            } else {
                showAdminNotification(result.message, 'error');
            }
        }
    }

    // Carregar lista de produtos
    function loadProductList() {
        adminProductList.innerHTML = '';
        
        if (appData.products.length === 0) {
            adminProductList.innerHTML = '<div class="empty-message">Nenhum produto cadastrado</div>';
            return;
        }
        
        // Agrupar produtos por categoria
        const productsByCategory = {};
        
        appData.products.forEach(product => {
            const categoryId = product.categoryId;
            if (!productsByCategory[categoryId]) {
                productsByCategory[categoryId] = [];
            }
            productsByCategory[categoryId].push(product);
        });
        
        // Criar seções para cada categoria
        appData.categories.forEach(category => {
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
                <p class="admin-product-price"><strong>Preço:</strong> R$ ${product.price.toFixed(2)}</p>
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
        // Criar um formulário modal para edição
        const editForm = document.createElement('form');
        editForm.className = 'edit-product-form';
        
        // Criar opções de categorias
        let categoryOptions = '';
        appData.categories.forEach(category => {
            categoryOptions += `<option value="${category.id}" ${category.id === product.categoryId ? 'selected' : ''}>${category.name}</option>`;
        });
        
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
                updateProduct(product.id, categoryId, name, description, price, image);
                document.body.removeChild(modal);
                loadAdminData();
                showAdminNotification('Produto atualizado com sucesso!', 'success');
            } else {
                showAdminNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
            }
        });
    }

    // Confirmar exclusão de produto
    function confirmDeleteProduct(product) {
        if (confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) {
            if (deleteProduct(product.id)) {
                loadAdminData();
                showAdminNotification('Produto excluído com sucesso!', 'success');
            } else {
                showAdminNotification('Erro ao excluir produto.', 'error');
            }
        }
    }

    // Adicionar funcionalidade de exportar/importar dados
    const exportBtn = document.createElement('button');
    exportBtn.className = 'admin-export-btn';
    exportBtn.innerHTML = '<i class="fas fa-download"></i> Exportar Dados';
    exportBtn.title = 'Exportar dados para backup';
    
    const importBtn = document.createElement('button');
    importBtn.className = 'admin-import-btn';
    importBtn.innerHTML = '<i class="fas fa-upload"></i> Importar Dados';
    importBtn.title = 'Importar dados de backup';
    
    // Adicionar botões ao painel administrativo
    const adminHeader = document.querySelector('.admin-header');
    const adminActions = document.createElement('div');
    adminActions.className = 'admin-header-actions';
    adminActions.appendChild(exportBtn);
    adminActions.appendChild(importBtn);
    adminHeader.appendChild(adminActions);
    
    // Evento para exportar dados
    exportBtn.addEventListener('click', function() {
        const dataStr = JSON.stringify(appData);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'mapeju_cardapio_backup.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        showAdminNotification('Dados exportados com sucesso!', 'success');
    });
    
    // Evento para importar dados
    importBtn.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                try {
                    const importedData = JSON.parse(event.target.result);
                    
                    // Validar dados importados
                    if (!importedData.categories || !importedData.products) {
                        throw new Error('Formato de arquivo inválido');
                    }
                    
                    // Confirmar importação
                    if (confirm('Tem certeza que deseja importar estes dados? Isso substituirá todos os dados atuais.')) {
                        appData = importedData;
                        saveData();
                        loadAdminData();
                        showAdminNotification('Dados importados com sucesso!', 'success');
                    }
                } catch (error) {
                    showAdminNotification('Erro ao importar dados: ' + error.message, 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    });
});
