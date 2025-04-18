# Guia do Usuário - Cardápio Digital Mapeju

Este guia explica como utilizar o cardápio digital da Mapeju com sincronização em tempo real entre dispositivos.

## Visão Geral

O cardápio digital da Mapeju foi atualizado para usar o Firebase, permitindo que todas as alterações feitas em um dispositivo sejam automaticamente sincronizadas com todos os outros dispositivos. Isso significa que você pode adicionar ou remover produtos em um computador e as alterações aparecerão instantaneamente em todos os dispositivos que estiverem acessando o cardápio.

## Funcionalidades

- **Sincronização em tempo real**: Alterações são refletidas instantaneamente em todos os dispositivos
- **Autenticação segura**: Área administrativa protegida por email e senha
- **Categorias de produtos**: Organize seus produtos em diferentes categorias
- **Integração com WhatsApp**: Envio de pedidos diretamente para o WhatsApp da Mapeju
- **Design responsivo**: Funciona perfeitamente em computadores, tablets e smartphones

## Como Acessar

Após o deploy, o cardápio estará disponível em uma URL fornecida pelo Firebase, como:
```
https://mapeju-cardapio.web.app
```

## Área do Cliente

### Navegação por Categorias
1. Selecione uma categoria no menu lateral para ver os produtos correspondentes
2. Cada produto exibe nome, descrição, preço e botão para adicionar ao carrinho

### Fazendo um Pedido
1. Clique em "Adicionar" nos produtos desejados
2. Revise seu pedido no carrinho (lado direito da tela ou botão flutuante em dispositivos móveis)
3. Ajuste as quantidades usando os botões + e -
4. Clique em "Fazer Pedido" para enviar o pedido via WhatsApp
5. Complete as informações de entrega diretamente no WhatsApp

### Pedido Rápido
1. Para pedir apenas um item, clique no botão "Pedir Agora" diretamente no produto
2. Isso enviará um pedido com apenas esse item via WhatsApp

## Área Administrativa

### Acessando o Painel Administrativo
1. Clique no botão "Área Administrativa" no topo da página
2. Digite o email e senha cadastrados no Firebase
3. Após o login, você terá acesso ao painel administrativo

### Gerenciando Categorias
1. Na aba "Categorias", você pode:
   - Adicionar novas categorias
   - Editar categorias existentes
   - Excluir categorias (apenas se não tiverem produtos)

### Gerenciando Produtos
1. Na aba "Produtos", você pode:
   - Adicionar novos produtos
   - Selecionar a categoria do produto
   - Definir nome, descrição, preço e URL da imagem
   - Editar produtos existentes
   - Excluir produtos

### Dicas Importantes
- As alterações são salvas automaticamente e sincronizadas em tempo real
- Você pode acessar o painel administrativo de qualquer dispositivo usando suas credenciais
- Recomendamos usar imagens hospedadas em serviços como Imgur, Google Drive (com link público) ou similar
- Para melhor experiência, use imagens de tamanho consistente (recomendado: 800x600 pixels)

## Solução de Problemas

### O cardápio não está carregando
- Verifique sua conexão com a internet
- Limpe o cache do navegador e tente novamente
- Tente acessar em outro navegador

### Não consigo fazer login na área administrativa
- Verifique se está usando o email e senha corretos
- Certifique-se de que o email foi cadastrado no Firebase Authentication
- Se esqueceu a senha, use a opção "Esqueci minha senha" no Firebase Authentication

### As alterações não estão aparecendo em outros dispositivos
- Verifique a conexão com a internet em ambos os dispositivos
- Atualize a página (F5 ou puxe para baixo em dispositivos móveis)
- Certifique-se de que está acessando a mesma URL em todos os dispositivos

## Suporte

Se precisar de ajuda adicional, entre em contato com o suporte técnico através do WhatsApp da Mapeju.
