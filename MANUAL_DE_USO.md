# MANUAL DE USO - SISTEMA DE ESTOQUE

Este sistema foi projetado para funcionar direto do navegador, conectando-se ao seu Excel no OneDrive.

## 🚫 Problema: "Por que não abre clicando no arquivo?"
Por motivos de segurança, a Microsoft **bloqueia** o login se o site estiver rodando direto do seu computador (endereço começando com `file://`). Isso é uma regra mundial de segurança de internet, não uma falha do sistema.

## ✅ Solução: Colocar o site "no ar" (Sem custo e sem instalar nada)
Como você não pode instalar nada no PC da empresa, a solução é colocar a pasta do projeto em um endereço seguro (`https://`) usando um serviço gratuito. O sistema rodará no navegador, e os dados ficarão no seu OneDrive.

### Passo 1: Preparar o Excel
1.  Pegue o arquivo **`BANCO_ALMOXARIFADO.xlsx`** que está nesta pasta.
2.  **Mova-o para o seu OneDrive** (pode ser na pasta raiz ou onde preferir).
3.  O sistema vai procurar por este arquivo na sua conta quando você fizer login.

### Passo 2: Colocar o site no ar (Opção Rápida: Netlify Drop)
Esta opção não instala nada no computador.
1.  Acesse o site: [app.netlify.com/drop](https://app.netlify.com/drop).
2.  Pegue a pasta **`ESTOQUE_ALMOXARIFADO`** inteira e arraste para dentro da área pontilhada no site.
3.  O site vai processar e gerar um **Link** (ex: `https://seu-site-aleatorio.netlify.app`).
4.  Este é o link do seu sistema! Você pode salvar nos favoritos.

### Passo 3: Autorizar o Link (Azure)
Agora você precisa avisar a Microsoft que esse novo link é seguro.
1.  Acesse o [Portal do Azure](https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps).
2.  Entre no registro **"Estoque Almoxarifado"** que criamos.
3.  No menu lateral, vá em **Autenticação**.
4.  Em **URIs de Redirecionamento**, clique em "Adicionar URI".
5.  Cole o link que o Netlify gerou (ex: `https://seu-site-aleatorio.netlify.app`).
6.  Clique em **Salvar**.
7.  Copie o **ID do Cliente** (na Visão Geral) e garanta que ele esteja no arquivo `js/config.js` (se ainda não estiver). *Nota: Se você mudar o config.js, precisa arrastar a pasta para o Netlify de novo.*

### Pronto!
Agora é só acessar o link, fazer o login com sua conta Microsoft e usar. O sistema vai ler e escrever direto na planilha do seu OneDrive.

---

## Dúvidas Comuns

**Os dados ficam públicos?**
Não. O site (HTML/JS) é público, mas os **DADOS** (Produtos, Entradas, Saídas) só aparecem se a pessoa fizer login com a **SUA** conta (ou conta autorizada da empresa) que tenha acesso ao arquivo no OneDrive.

**Preciso atualizar o site?**
Só se você mudar o código. Se mudar dados na planilha, o site atualiza sozinho.
