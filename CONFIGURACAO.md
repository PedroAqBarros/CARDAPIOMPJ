# Guia de Configuração do Firebase

Este arquivo contém instruções detalhadas para configurar o Firebase e fazer o deploy do cardápio digital da Mapeju.

## Passo 1: Criar uma conta no Firebase

1. Acesse [firebase.google.com](https://firebase.google.com/)
2. Clique em "Começar" ou "Get started"
3. Faça login com sua conta Google

## Passo 2: Criar um novo projeto

1. Clique em "Adicionar projeto" ou "Add project"
2. Digite um nome para o projeto (ex: "mapeju-cardapio")
3. Desative o Google Analytics se desejar (opcional)
4. Clique em "Criar projeto" ou "Create project"

## Passo 3: Registrar sua aplicação web

1. Na página inicial do projeto, clique no ícone da web (</>) para adicionar uma aplicação web
2. Digite um nome para a aplicação (ex: "Cardápio Mapeju")
3. Marque a opção "Configurar também o Firebase Hosting"
4. Clique em "Registrar app" ou "Register app"
5. Copie as configurações do Firebase que serão exibidas

## Passo 4: Atualizar as configurações no código

1. Abra o arquivo `js/firebase-config.js`
2. Substitua as configurações de exemplo pelas suas próprias configurações:

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

## Passo 5: Configurar o Firestore Database

1. No console do Firebase, vá para "Firestore Database"
2. Clique em "Criar banco de dados"
3. Selecione "Iniciar no modo de produção"
4. Escolha a região mais próxima (ex: "us-east1")
5. Clique em "Ativar"

## Passo 6: Configurar regras de segurança do Firestore

1. Vá para a aba "Regras" no Firestore
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

## Passo 7: Configurar autenticação

1. No console do Firebase, vá para "Authentication"
2. Clique em "Começar" ou "Get started"
3. Selecione "Email/Senha" como método de login
4. Ative a opção "Email/Senha"
5. Clique em "Salvar"

## Passo 8: Criar um usuário administrativo

1. Na seção "Authentication", vá para a aba "Usuários"
2. Clique em "Adicionar usuário" ou "Add user"
3. Digite seu email e uma senha forte
4. Clique em "Adicionar usuário" ou "Add user"

## Passo 9: Instalar as ferramentas do Firebase

1. Abra um terminal ou prompt de comando
2. Instale o Firebase CLI globalmente:
   ```
   npm install -g firebase-tools
   ```
3. Faça login no Firebase:
   ```
   firebase login
   ```

## Passo 10: Fazer o deploy

1. Navegue até a pasta do projeto no terminal
2. Inicialize o projeto Firebase (se ainda não tiver feito):
   ```
   firebase init
   ```
   - Selecione "Hosting"
   - Selecione seu projeto
   - Use "." como diretório público
   - Configure como aplicação de página única: Sim
   - Não sobrescreva o arquivo index.html

3. Faça o deploy:
   ```
   firebase deploy
   ```

4. Após o deploy, você receberá uma URL pública onde seu cardápio está hospedado

## Passo 11: Atualizações futuras

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
