const Config = {
    // Registre seu aplicativo no Portal do Azure (App Registrations)
    // Configure a "Single Page Application" e adicione http://localhost:8080 (ou sua URL) como Redirect URI
    clientId: "SEU_CLIENT_ID_AQUI", 
    authority: "https://login.microsoftonline.com/common", // Ou seu Tenant ID
    scopes: ["Files.ReadWrite", "User.Read"],
    
    // Nome do arquivo no OneDrive (Raiz ou pasta específica)
    // O sistema buscará por este nome exato
    excelFileName: "BANCO_ALMOXARIFADO.xlsx",
    
    // Configuração para Modo Leitura Público (Opcional)
    // Se não estiver logado, tentará usar este link (feature futura)
    publicShareLink: "" 
};
