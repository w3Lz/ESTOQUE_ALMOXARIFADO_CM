# Plano de Implementação: Sistema de Controle de Estoque (Excel Online)

Este plano descreve a criação de um sistema web Single Page Application (SPA) para gestão de estoque, utilizando Excel Online como banco de dados e Microsoft Graph API para integração.

## 1. Estrutura do Projeto
*   **Frontend Puro**: HTML5, CSS3, JavaScript (ES6+).
*   **Bibliotecas**:
    *   `MSAL.js` (Microsoft Authentication Library) para autenticação.
    *   `SheetJS` (Opcional, se necessário para parsear dados públicos) ou uso direto da Graph API JSON.
*   **Arquivos**:
    *   `index.html`: Estrutura única da aplicação (SPA).
    *   `css/style.css`: Estilização responsiva e tema Goodyear.
    *   `js/auth.js`: Gerenciamento de login Microsoft.
    *   `js/graph.js`: Interação com Excel via API.
    *   `js/app.js`: Lógica de negócio e UI.
    *   `js/config.example.js`: Arquivo modelo de configuração.

## 2. Preparação (Pré-requisitos)
*   *Ação do Usuário Necessária*:
    1.  Criar arquivo `Estoque.xlsx` no OneDrive com as tabelas: `PRODUTOS`, `ENTRADAS`, `SAIDAS`.
    2.  Registrar a aplicação no **Azure Portal** para obter o `Client ID`.
    3.  Configurar permissões de API (`Files.ReadWrite`).

## 3. Desenvolvimento - Etapas
### Fase 1: Configuração e Autenticação (Admin)
1.  Criar estrutura de arquivos.
2.  Implementar `auth.js` com MSAL para login via conta Microsoft.
3.  Configurar escopos de permissão para leitura/escrita no OneDrive.

### Fase 2: Integração com Excel (Graph API)
1.  Implementar funções para:
    *   Listar linhas de uma tabela (`GET`).
    *   Adicionar linhas (`POST`).
    *   Atualizar linhas (`PATCH`).
2.  Mapear as planilhas `PRODUTOS`, `ENTRADAS`, `SAIDAS`.
3.  *Estratégia de Saldo*: Calcular o saldo em tempo real no JavaScript (somando Entradas - Saídas) para garantir performance e responsividade, exibindo na aba "SALDO" virtualmente ou lendo de uma tabela calculada se preferir.

### Fase 3: Interface e Regras de Negócio
1.  **Dashboard**: Visualização de Cards com Saldo e Alertas.
2.  **Formulários**:
    *   Cadastro de Produto.
    *   Registro de Entrada/Saída (com validação de saldo negativo).
3.  **Modo Usuário (Sem Login)**:
    *   Implementar leitura via Link de Compartilhamento Público (Download direto) e processamento local dos dados para visualização (requer que o arquivo esteja compartilhado publicamente).

### Fase 4: Estilização (UI/UX)
1.  Aplicar paleta Goodyear (Azul Escuro, Amarelo).
2.  Layout responsivo (Mobile-first).
3.  Feedback visual (Spinners de carregamento, Toasts de sucesso/erro).

## 4. Entregáveis
*   Código fonte completo e organizado.
*   Instruções de configuração (README ou Comentários) para o registro no Azure e setup da planilha.

Deseja iniciar a implementação por qual parte? Sugiro começar pela **Estrutura de Arquivos e Interface Básica** enquanto preparamos a lógica de autenticação.