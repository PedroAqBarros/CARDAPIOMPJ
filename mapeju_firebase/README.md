# Mapeju Doces - Cardápio Digital

## Configuração de Segurança

As chaves de API e credenciais estão atualmente configuradas diretamente no arquivo `js/config.js`. Porém, para projetos em produção, recomendamos o uso de um arquivo `secret.json` separado, que não seria enviado ao repositório.

### Configuração Atual
As chaves já estão configuradas no arquivo `js/config.js` e você pode usar o projeto diretamente sem nenhuma configuração adicional.

### Configuração Recomendada para Produção
Para garantir a segurança das chaves de API e credenciais em um ambiente de produção:

1. Crie um arquivo chamado `secret.json` na raiz do projeto (pasta `mapeju_firebase/`)
2. Copie o conteúdo do arquivo `secret.example.json` para o seu `secret.json`
3. Substitua os valores de exemplo pelas suas chaves reais
4. Modifique o arquivo `js/config.js` para carregar as configurações a partir do `secret.json`

### Exemplo de secret.json:

```json
{
    "GOOGLE_MAPS_API_KEY": "SUA_CHAVE_API_GOOGLE_MAPS",
    "FIREBASE_CONFIG": {
        "apiKey": "SUA_CHAVE_API_FIREBASE",
        "authDomain": "seu-projeto.firebaseapp.com",
        "projectId": "seu-projeto",
        "storageBucket": "seu-projeto.appspot.com",
        "messagingSenderId": "0000000000000",
        "appId": "1:000000000000:web:0000000000000000000",
        "measurementId": "G-XXXXXXXXXX"
    },
    "WHATSAPP_NUMBER": "5500000000000"
}
```

**IMPORTANTE**: O arquivo `secret.json` já está incluído no `.gitignore` para evitar que seja enviado acidentalmente ao repositório.

## Executando o Projeto

Você pode executar o projeto localmente usando o Firebase CLI ou um servidor web local. 