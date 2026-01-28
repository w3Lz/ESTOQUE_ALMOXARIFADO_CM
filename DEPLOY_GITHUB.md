# COMO HOSPEDAR NO GITHUB PAGES (GRÁTIS)

Esta é a melhor opção para colocar o sistema no ar de forma gratuita e profissional, funcionando 100% com o Login da Microsoft.

## Passo 1: Criar o Repositório no GitHub
1.  Crie uma conta no [GitHub.com](https://github.com) (se não tiver).
2.  Clique no **+** (canto superior direito) e **New repository**.
3.  Nome do repositório: `estoque-almoxarifado` (ou o nome que preferir).
4.  Deixe como **Public** (o código será público, mas seus dados do Excel continuam seguros).
5.  Clique em **Create repository**.

## Passo 2: Subir os Arquivos
No terminal do seu projeto (aqui no VS Code/Trae), rode os comandos:

```bash
git init
git add .
git commit -m "Versão inicial do Sistema de Estoque"
git branch -M main
# Substitua SEU_USUARIO pelo seu usuário do GitHub
git remote add origin https://github.com/SEU_USUARIO/estoque-almoxarifado.git
git push -u origin main
```

## Passo 3: Ativar o GitHub Pages
1.  No site do GitHub, vá no seu repositório.
2.  Clique em **Settings** > **Pages** (menu lateral esquerdo).
3.  Em **Build and deployment** > **Source**, escolha `Deploy from a branch`.
4.  Em **Branch**, selecione `main` e a pasta `/ (root)`. Clique em **Save**.
5.  Aguarde uns minutos. O GitHub vai gerar um link como:
    👉 `https://seu-usuario.github.io/estoque-almoxarifado/`

## Passo 4: Autorizar na Microsoft (Azure)
Este é o passo mais importante para o login funcionar.

1.  Copie o link gerado acima (com a barra no final).
2.  Vá no [Portal do Azure](https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps).
3.  Selecione seu aplicativo (`Estoque Almoxarifado`).
4.  Vá em **Autenticação** > **Adicionar URI**.
5.  Cole o link do GitHub Pages.
6.  **Importante**: Adicione também o link sem a barra no final, para garantir.
    *   `https://seu-usuario.github.io/estoque-almoxarifado/`
    *   `https://seu-usuario.github.io/estoque-almoxarifado`
7.  Clique em **Salvar**.

## Pronto!
Agora você pode acessar o sistema de qualquer lugar pelo link do GitHub Pages.
Lembre-se: O arquivo `BANCO_ALMOXARIFADO.xlsx` deve estar no seu OneDrive pessoal.
