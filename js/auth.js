const auth = {
    tokenClient: null,
    gapiInited: false,
    gisInited: false,
    user: null,

    init: () => {
        gapi.load('client', auth.initializeGapiClient);
        auth.initializeGisClient();
    },

    initializeGapiClient: async () => {
        await gapi.client.init({
            apiKey: Config.apiKey,
            discoveryDocs: Config.discoveryDocs,
        });
        auth.gapiInited = true;
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
                auth.handleAuthSuccess();
            },
        });
        auth.gisInited = true;
    },

    signIn: () => {
        if (!auth.tokenClient) return;
        
        // Request access token
        if (gapi.client.getToken() === null) {
            // Prompt the user to select a Google Account and ask for consent to share their data
            // when establishing a new session.
            auth.tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            // Skip display of account chooser and consent dialog for an existing session.
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

    handleAuthSuccess: () => {
        // We don't get user profile directly from Token Client in implicit flow easily without another API call (People API)
        // For simplicity, we just say "Logado" or try to get basic info if possible, 
        // or just rely on the fact we have a token.
        // Let's assume success and show a generic user or try to parse ID token if we used OIDC (but we used initTokenClient)
        
        auth.user = { name: "Usuário Google" }; // Placeholder
        ui.updateAuthUI(auth.user);
        
        // Trigger data load
        app.initData();
    },
    
    checkAuth: () => {
        // Check if we have a valid token stored? 
        // GAPI client stores it in memory. If page reload, it's gone.
        // Implicit flow usually requires re-auth or silent auth.
        // For this MVP, user clicks login.
    }
};
