const auth = {
    tokenClient: null,
    gapiInited: false,
    gisInited: false,
    user: null,

    // Helper to wait for libraries
    waitForLibraries: () => {
        return new Promise((resolve) => {
            const check = () => {
                if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(check, 100); // Check every 100ms
                }
            };
            check();
        });
    },

    init: async () => {
        console.log("Aguardando bibliotecas do Google...");
        await auth.waitForLibraries();
        console.log("Bibliotecas carregadas. Inicializando GAPI...");
        
        gapi.load('client', auth.initializeGapiClient);
        auth.initializeGisClient();
    },

    initializeGapiClient: async () => {
        await gapi.client.init({
            apiKey: Config.apiKey,
            discoveryDocs: Config.discoveryDocs,
        });
        auth.gapiInited = true;
        
        // After GAPI init (with API Key), we can try to read public data immediately
        console.log("GAPI inicializado. Tentando ler dados...");
        app.initData();
        
        // Check if we have a cached token (optional, simple check)
        auth.checkAuth();
    },

    initializeGisClient: () => {
        auth.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: Config.clientId,
            scope: Config.scopes,
            callback: (resp) => {
                if (resp.error !== undefined) {
                    throw (resp);
                }
                auth.handleAuthSuccess(resp);
            },
        });
        auth.gisInited = true;
    },

    signIn: () => {
        if (!auth.tokenClient) return;
        
        // Request access token
        if (gapi.client.getToken() === null) {
            auth.tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            auth.tokenClient.requestAccessToken({prompt: ''});
        }
    },

    signOut: () => {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
            auth.user = null;
            ui.updateAuthUI(null);
        }
    },

    handleAuthSuccess: (resp) => {
        // Token is auto-set by GIS client in newer versions? 
        // No, initTokenClient doesn't auto-set gapi client token in all cases, 
        // but often they work together if gapi is loaded.
        // Explicitly setting it to be safe if response has it.
        /* 
           Note: With initTokenClient (Implicit Flow), the access_token is in resp.
           We might need to manually set it for gapi.client if they are decoupled.
        */
        if (resp && resp.access_token) {
            gapi.client.setToken(resp);
        }

        auth.user = { name: "Usuário Logado" }; 
        ui.updateAuthUI(auth.user);
        
        // Reload data with full permissions
        app.initData();
    },
    
    checkAuth: () => {
        // Just a placeholder. Implicit flow state is managed by the browser session/token validity.
    },
    
    // Helper to check if we can write
    isAuthenticated: () => {
        return gapi.client.getToken() !== null;
    }
};
