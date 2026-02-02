# COMO LIBERAR ACESSO PARA OUTRAS PESSOAS (MULTI-USUÁRIO)

Atualmente, o sistema usa a segurança do Google. Para que outras pessoas consigam cadastrar produtos e movimentações (CRUD) usando as contas Google delas, você precisa dar permissão na sua planilha.

Você tem duas opções:

## OPÇÃO 1: Liberar para Qualquer Pessoa (Mais Fácil)
Ideal se você vai compartilhar o link apenas com pessoas de confiança.

1. Acesse seu **Google Drive**.
2. Localize o arquivo `BANCO_ALMOXARIFADO.xlsx`.
3. Clique com o botão direito > **Compartilhar**.
4. Em "Acesso geral", mude de "Restrito" para **"Qualquer pessoa com o link"**.
5. Ao lado, mude de "Leitor" para **"Editor"**.
6. Clique em **Concluído**.

✅ **Resultado:** Qualquer pessoa que acessar seu sistema e fizer login com *qualquer* conta Gmail conseguirá editar o estoque.

---

## OPÇÃO 2: Liberar Apenas E-mails Específicos (Mais Seguro)
Ideal se você quer ter controle total de quem mexe.

1. Acesse seu **Google Drive**.
2. Localize o arquivo `BANCO_ALMOXARIFADO.xlsx`.
3. Clique com o botão direito > **Compartilhar**.
4. No campo "Adicionar pessoas e grupos", digite o **e-mail do Google** da pessoa que vai usar.
5. Certifique-se que a permissão ao lado está como **"Editor"**.
6. Clique em **Enviar**.

✅ **Resultado:** Apenas os e-mails que você adicionou conseguirão salvar dados. Outras pessoas poderão apenas ver (se o acesso geral for Leitor) ou nem abrir (se for Restrito).

---

## IMPORTANTE
Em ambos os casos, **o usuário PRECISARÁ clicar no botão "Login Google"** no sistema.
Isso é obrigatório pela API do Google para garantir a segurança e registrar quem fez a alteração (auditoria).
