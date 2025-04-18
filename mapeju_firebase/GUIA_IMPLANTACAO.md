# Guia de Implantação do Cardápio Digital Mapeju

Este guia contém instruções passo a passo para implantar permanentemente o cardápio digital da Mapeju com sincronização em tempo real entre dispositivos.

## Pré-requisitos

- Uma conta Google
- Acesso à internet
- Conhecimentos básicos de navegação na web

## Visão Geral do Processo

1. Criar uma conta no Firebase (gratuito)
2. Criar um novo projeto
3. Configurar o banco de dados Firestore
4. Configurar a autenticação
5. Fazer o deploy do cardápio digital

## Passo 1: Criar uma conta no Firebase

1. Acesse [firebase.google.com](https://firebase.google.com/)
2. Clique em "Começar" ou "Get started"
3. Faça login com sua conta Google

## Passo 2: Criar um novo projeto Firebase

1. No console do Firebase, clique em "Adicionar projeto" ou "Add project"
2. Digite "mapeju-cardapio" como nome do projeto
3. Desative o Google Analytics (opcional)
4. Clique em "Criar projeto" ou "Create project"
5. Aguarde a criação do projeto e clique em "Continuar" quando concluído

## Passo 3: Registrar sua aplicação web

1. Na página inicial do projeto, clique no ícone da web (</>) para adicionar uma aplicação web
2. Digite "Cardápio Mapeju" como nome da aplicação
3. Marque a opção "Configurar também o Firebase Hosting"
4. Clique em "Registrar app" ou "Register app"
5. **IMPORTANTE**: Copie as configurações do Firebase que serão exibidas (você precisará delas mais tarde)
6. Clique em "Próximo" até concluir o assistente

## Passo 4: Configurar o Firestore Database

1. No menu lateral, clique em "Firestore Database"
2. Clique em "Criar banco de dados"
3. Selecione "Iniciar no modo de produção"
4. Escolha a região mais próxima (ex: "us-east1" ou "southamerica-east1")
5. Clique em "Ativar"
6. Aguarde a criação do banco de dados

## Passo 5: Configurar regras de segurança do Firestore

1. Na página do Firestore, clique na aba "Regras"
2. Substitua as regras existentes por:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir leitura pública para todos
    match /categories/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /products/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Outras coleções só podem ser acessadas por usuários autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Clique em "Publicar"

## Passo 6: Configurar autenticação

1. No menu lateral, clique em "Authentication"
2. Clique em "Começar" ou "Get started"
3. Selecione "Email/Senha" como método de login
4. Ative a opção "Email/Senha"
5. Clique em "Salvar"

## Passo 7: Criar um usuário administrativo

1. Na seção "Authentication", vá para a aba "Usuários"
2. Clique em "Adicionar usuário" ou "Add user"
3. Digite seu email e uma senha forte (anote-os, pois serão usados para acessar a área administrativa do cardápio)
4. Clique em "Adicionar usuário" ou "Add user"

## Passo 8: Atualizar as configurações no código

1. Descompacte o arquivo ZIP do cardápio digital em seu computador
2. Abra o arquivo `js/firebase-config.js` em um editor de texto
3. Substitua as configurações de exemplo pelas suas próprias configurações que você copiou no Passo 3:

```javascript
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};
```

4. Salve o arquivo

## Passo 9: Instalar as ferramentas do Firebase

1. Abra um terminal ou prompt de comando
2. Instale o Node.js se ainda não tiver instalado:
   - Windows/Mac: Baixe e instale do [site oficial](https://nodejs.org/)
   - Linux: Use o gerenciador de pacotes da sua distribuição

3. Instale o Firebase CLI globalmente:
   ```
   npm install -g firebase-tools
   ```

4. Faça login no Firebase:
   ```
   firebase login
   ```
   
   Isso abrirá uma janela do navegador para você autorizar o acesso.

## Passo 10: Fazer o deploy

1. Navegue até a pasta do projeto no terminal:
   ```
   cd caminho/para/pasta/mapeju_firebase
   ```

2. Inicialize o projeto Firebase:
   ```
   firebase init
   ```

3. Selecione as seguintes opções:
   - Selecione "Hosting: Configure files for Firebase Hosting..."
   - Selecione o projeto que você criou ("mapeju-cardapio")
   - Use "." como diretório público
   - Configure como aplicação de página única: Sim
   - NÃO sobrescreva o arquivo index.html (responda "N")

4. Faça o deploy:
   ```
   firebase deploy
   ```

5. Após o deploy, você receberá uma URL pública onde seu cardápio está hospedado, algo como:
   ```
   https://mapeju-cardapio.web.app
   ```

## Passo 11: Acessar o cardápio digital

1. Abra a URL fornecida após o deploy em qualquer navegador
2. Para acessar a área administrativa:
   - Clique no botão "Área Administrativa"
   - Digite o email e senha que você criou no Passo 7
   - Comece a adicionar categorias e produtos

## Passo 12: Atualizações futuras

Para atualizar o cardápio no futuro:

1. Faça as alterações necessárias nos arquivos
2. Execute o comando de deploy novamente:
   ```
   firebase deploy
   ```

## Solução de problemas

- **Erro de autenticação**: Verifique se as credenciais no arquivo firebase-config.js estão corretas
- **Erro de permissão**: Verifique as regras de segurança do Firestore
- **Erro de deploy**: Certifique-se de que está logado na conta correta do Firebase

## Recursos adicionais

- [Documentação do Firebase](https://firebase.google.com/docs)
- [Guia do Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Guia do Firestore](https://firebase.google.com/docs/firestore)

Se precisar de ajuda adicional, consulte a documentação oficial do Firebase ou entre em contato com suporte técnico.
