# MANUAL: GOOGLE SHEETS

Agora o sistema usa o **Google Sheets** como banco de dados.

## 1. Configurar o Google Cloud (Obrigatório)
Para que o sistema acesse sua planilha, você precisa criar credenciais no Google.

1.  Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2.  Crie um **Novo Projeto** (ex: "Controle Estoque").
3.  No menu lateral, vá em **APIs e Serviços** > **Biblioteca**.
    *   Pesquise por "Google Sheets API" e clique em **Ativar**.
4.  Vá em **APIs e Serviços** > **Credenciais**.
    *   **Criar Credenciais** > **Chave de API** (API Key). Copie essa chave.
    *   **Criar Credenciais** > **ID do cliente OAuth**.
        *   Tipo de Aplicativo: **Aplicação Web**.
        *   Origens JavaScript autorizadas:
            *   `http://127.0.0.1:5500` (para testar localmente)
            *   `https://SEU-USUARIO.github.io` (para o site no ar)
        *   Clique em Criar e copie o **ID do Cliente**.
5.  **Configurar Tela de Permissão** (Se não achar, siga aqui):
    *   No menu lateral esquerdo, clique primeiro em **APIs e Serviços** (ícone parece um conector/tomada).
    *   Dentro dele, clique em **Tela de permissão OAuth** (OAuth consent screen).
    *   💡 **Dica:** Se não encontrar, digite "OAuth consent screen" na barra de busca lá no topo da página e clique no primeiro resultado.
    
    *   Se for a primeira vez, escolha **Externo** e clique em **Criar**.
    *   **Passo 1 (Informações do App)**:
        *   Nome do App: "Estoque".
        *   Email de suporte: Selecione o seu.
        *   Dados de contato: Coloque seu email novamente.
        *   Clique em **Salvar e Continuar**.
    *   **Passo 2 (Escopos)**: Pode pular, clique em **Salvar e Continuar**.
    *   **Passo 3 (Usuários de Teste)**: **AQUI ESTÁ O SEGREDO!**
        *   Clique no botão **+ ADD USERS** (Adicionar Usuários).
        *   Digite o seu email (o mesmo que você vai usar para logar no sistema).
        *   Clique em **Adicionar**.
        *   Clique em **Salvar e Continuar**.
    *   **Passo 4 (Resumo)**: Clique em **Voltar para o Painel**.

## 2. Configurar o Código
Abra o arquivo `js/config.js` e preencha:
```javascript
clientId: "SEU_CLIENT_ID...",
apiKey: "SUA_API_KEY...",
spreadsheetId: "ID_DA_PLANILHA..." 
```

## 3. Pegar o ID da Planilha
Abra sua planilha no Google Sheets e olhe a URL:
`https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE`**`/edit`
O código estranho entre as barras é o ID.

## 4. Estrutura da Planilha
Garanta que sua planilha tenha as abas com estes nomes exatos e colunas na linha 1:

*   **PRODUTOS**: `ID`, `CODIGO`, `TIPO`, `NOME`, `UNIDADE`, `ESTOQUE_MINIMO`, `ATIVO`, `CRIADO_EM`
*   **ENTRADAS**: `ID`, `DATA`, `PRODUTO_ID`, `QUANTIDADE`, `ORIGEM`, `USUARIO`, `OBSERVACAO`, `CRIADO_EM`
*   **SAIDAS**: `ID`, `DATA`, `PRODUTO_ID`, `QUANTIDADE`, `DESTINO`, `USUARIO`, `OBSERVACAO`, `CRIADO_EM`
