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
        // console.log("Aguardando bibliotecas do Google...");
        await auth.waitForLibraries();
        // console.log("Bibliotecas carregadas. Inicializando GAPI...");
        
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
        // console.log("GAPI inicializado. Tentando ler dados...");
        app.initData();
        
        // Auth check moved to initializeGisClient to ensure tokenClient is ready
    },

    initializeGisClient: () => {
        auth.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: Config.clientId,
            scope: Config.scopes,
            callback: (resp) => {
                if (resp.error !== undefined) {
                    console.warn("Erro na autenticação:", resp);
                    // Se falhar o silent refresh, limpa tudo
                    if (resp.error === 'interaction_required' || resp.error === 'login_required') {
                        auth.signOut();
                    }
                    throw (resp);
                }
                auth.handleAuthSuccess(resp);
            },
        });
        auth.gisInited = true;
        // Check auth after GIS init to enable silent refresh possibility
        auth.checkAuth();
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
        // Clear storage
        localStorage.removeItem('g_token');
        localStorage.removeItem('g_token_exp');
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
            
            // Save to localStorage
            const expiresIn = resp.expires_in; // seconds
            const expirationTime = Date.now() + (expiresIn * 1000);
            localStorage.setItem('g_token', JSON.stringify(resp));
            localStorage.setItem('g_token_exp', expirationTime);
        }

        auth.getUserProfile();
    },
    
    getUserProfile: async () => {
        // Try to get user info if possible, or just mock
        try {
            // Optional: Request user info if scope allows 'profile email'
            // For now, simple mock or just "Logado"
            // If you added 'https://www.googleapis.com/auth/userinfo.profile' to scopes:
            /*
            const res = await gapi.client.request({ path: 'https://www.googleapis.com/oauth2/v3/userinfo' });
            auth.user = { name: res.result.name, picture: res.result.picture };
            */
            auth.user = { name: "Usuário Conectado" };
            ui.updateAuthUI(auth.user);
            app.initData();
        } catch (e) {
            console.error(e);
            auth.user = { name: "Usuário" };
            ui.updateAuthUI(auth.user);
        }
    },

    checkAuth: () => {
        const storedToken = localStorage.getItem('g_token');
        const expirationTime = localStorage.getItem('g_token_exp');

        if (storedToken && expirationTime) {
            const now = Date.now();
            if (now < parseInt(expirationTime)) {
                // console.log("Token recuperado do cache.");
                // Ensure gapi client is ready
                if (gapi.client) {
                    const tokenObj = JSON.parse(storedToken);
                    gapi.client.setToken(tokenObj);
                    auth.getUserProfile();
                } else {
                    // console.warn("GAPI Client not ready for token restoration. Retrying in 1s...");
                    setTimeout(auth.checkAuth, 1000);
                }
            } else {
                // console.log("Token expirado. Tentando renovação silenciosa...");
                if (auth.tokenClient) {
                    auth.tokenClient.requestAccessToken({prompt: 'none'});
                }
            }
        }
    },
    
    // Helper to check if we can write
    isAuthenticated: () => {
        return gapi.client.getToken() !== null;
    }
};
