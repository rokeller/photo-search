import { BrowserCacheLocation, Configuration, PublicClientApplication } from '@azure/msal-browser';

export const msalConfig: Configuration = {
    auth: {
        ...globalThis.photoSearch.auth,
        redirectUri: '/',
    },
    system: {
        protocolMode: 'OIDC',
    },
    cache: {
        cacheLocation: BrowserCacheLocation.SessionStorage,
    },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export function useAccessToken(): Promise<string> {
    const accounts = msalInstance.getAllAccounts();

    if (accounts.length > 0) {
        return msalInstance
            .initialize()
            .then(() => msalInstance
                .acquireTokenSilent({
                    account: accounts[0],
                    scopes: globalThis.photoSearch.auth.scopes,
                })
                .then((resp) => resp.accessToken)
            )
            .catch((error) => {
                console.error('silen token acquisition failed', error);
                msalInstance.clearCache();
                location.reload();
                throw new Error('not authenticated');
            });
    }
    throw new Error('not authenticated');
}
