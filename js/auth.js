const auth = {
    msalInstance: null,
    account: null,

    init: async () => {
        const msalConfig = {
            auth: {
                clientId: Config.clientId,
                authority: Config.authority,
                // Ajuste para GitHub Pages: Usa o caminho completo (ex: https://user.github.io/repo/)
                // Remove 'index.html' se estiver presente para evitar duplicação no redirect
                redirectUri: window.location.href.replace('index.html', '').split('?')[0].split('#')[0]
            },
            cache: {
                cacheLocation: "sessionStorage",
                storeAuthStateInCookie: false,
            }
        };

        auth.msalInstance = new msal.PublicClientApplication(msalConfig);
        await auth.msalInstance.initialize();

        // Check if user is already signed in
        const accounts = auth.msalInstance.getAllAccounts();
        if (accounts.length > 0) {
            auth.handleResponse(accounts[0]);
        }
    },

    signIn: async () => {
        try {
            const loginResponse = await auth.msalInstance.loginPopup({
                scopes: Config.scopes
            });
            auth.handleResponse(loginResponse.account);
        } catch (error) {
            console.error(error);
            ui.showToast("Erro ao fazer login: " + error.message, "error");
        }
    },

    signOut: async () => {
        const logoutRequest = {
            account: auth.msalInstance.getAccountByHomeId(auth.account.homeAccountId)
        };
        await auth.msalInstance.logoutPopup(logoutRequest);
        auth.account = null;
        ui.updateAuthUI(null);
        window.location.reload();
    },

    handleResponse: (account) => {
        auth.account = account;
        ui.updateAuthUI(account);
        console.log("Logado como:", account.username);
        // Trigger data load
        app.initData();
    },

    getToken: async () => {
        if (!auth.account) throw new Error("Usuário não logado");

        try {
            const response = await auth.msalInstance.acquireTokenSilent({
                account: auth.account,
                scopes: Config.scopes
            });
            return response.accessToken;
        } catch (error) {
            console.warn("Silent token acquisition failed, trying popup", error);
            if (error instanceof msal.InteractionRequiredAuthError) {
                 const response = await auth.msalInstance.acquireTokenPopup({
                    scopes: Config.scopes
                });
                return response.accessToken;
            }
            throw error;
        }
    }
};
