const Config = {
    // 1. Crie um projeto no Google Cloud Console (https://console.cloud.google.com/)
    // 2. Ative a API "Google Sheets API".
    // 3. Em "Credenciais", crie uma "Chave de API" (API Key).
    // 4. Em "Credenciais", crie um "ID do cliente OAuth 2.0" (Client ID).
    //    - Tipo: Aplicativo Web
    //    - Origens JavaScript autorizadas: http://127.0.0.1:5500 e https://SEU-USUARIO.github.io
    
    clientId: "344467298505-jqkosuif1p5289b7k37rlt9kcevaau14.apps.googleusercontent.com",
    apiKey: "AIzaSyDJsQpjgNVbn1g8qwFaDZBCaYhtzXPfTjY",
    
    // ID da Planilha (pegar da URL do Google Sheets)
    // Ex: https://docs.google.com/spreadsheets/d/ID_DA_PLANILHA/edit
    spreadsheetId: "1hklNExiSBbh0Hi-PIfkiJp86rV1dZZVEh1hKL8Q3DAI",
    
    // Escopos necessários
    scopes: "https://www.googleapis.com/auth/spreadsheets",
    discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"]
};
