# Sistema de Controle de Estoque (Excel Online)

Este sistema gerencia o estoque do almoxarifado conectando-se diretamente a uma planilha no OneDrive.

## ⚠️ Importante: Sobre "Sem Servidor"
Para que o Login da Microsoft funcione por segurança, o site precisa rodar em um endereço `http://` ou `https://`.
**Não é possível abrir clicando direto no arquivo `index.html`** (protocolo `file://`), pois a Microsoft bloqueia essa autenticação.

### Solução Simples (Recomendada)
Como você já está usando o editor de código (VS Code / Trae), basta:
1.  Clicar com o botão direito no arquivo `index.html`.
2.  Escolher a opção **"Open with Live Server"** (Abrir com Live Server).
3.  O navegador abrirá automaticamente em `http://127.0.0.1:5500`.

## Configuração Obrigatória (Só na 1ª vez)

### 1. Planilha no OneDrive
O sistema já identificou o arquivo **`BANCO_ALMOXARIFADO.xlsx`** na pasta do projeto.
1.  **Mova este arquivo** para a pasta **Raiz** (ou Meus Arquivos) do seu OneDrive pessoal ou corporativo.
2.  O sistema buscará exatamente por este nome.

### 2. Registrar o Aplicativo (Azure AD)
Para permitir o acesso à sua planilha:
1.  Acesse o [Portal do Azure](https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps).
2.  **Novo registro**:
    *   Nome: `Estoque Almoxarifado`.
    *   Tipos de conta: **Contas em qualquer diretório organizacional e contas pessoais**.
    *   URI de Redirecionamento (SPA): Adicione `http://127.0.0.1:5500` e `http://localhost:5500` (padrão do Live Server).
3.  Copie o **ID do Aplicativo (cliente)**.
4.  Abra o arquivo `js/config.js` neste projeto e cole o ID.

## Funcionalidades
*   **Dashboard**: Visão geral de saldo e alertas.
*   **Produtos**: Cadastro com Código, Unidade e Estoque Mínimo.
*   **Entradas/Saídas**: Registro com data, origem/destino e responsável.
*   **Sincronização**: Atualiza automaticamente a cada 30s.

## Estrutura de Dados (Excel)
O sistema espera as seguintes colunas (já configuradas no arquivo fornecido):
*   **PRODUTOS**: ID, CODIGO, TIPO, NOME, UNIDADE, ESTOQUE_MINIMO, ATIVO, CRIADO_EM
*   **ENTRADAS**: ID, DATA, PRODUTO_ID, QUANTIDADE, ORIGEM, USUARIO, OBSERVACAO, CRIADO_EM
*   **SAIDAS**: ID, DATA, PRODUTO_ID, QUANTIDADE, DESTINO, USUARIO, OBSERVACAO, CRIADO_EM
