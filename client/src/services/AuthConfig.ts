import { BrowserCacheLocation, Configuration, PopupRequest } from '@azure/msal-browser';

interface AuthConfiguration {
    clientId: string;
    authority: string;
    scopes: string[];
}

const configPromise = loadConfig();

async function loadConfig() {
    const resp = await fetch('/.well-known/flrx39.net/photoSearch/auth/config');
    return (await resp.json()) as AuthConfiguration;
}

export async function getMsalConfig() {
    const config = await configPromise;
    const msalConfig: Configuration = {
        auth: {
            clientId: config.clientId,
            authority: config.authority,
            redirectUri: '/',
            protocolMode: 'OIDC',
        },
        cache: {
            cacheLocation: BrowserCacheLocation.LocalStorage,
            claimsBasedCachingEnabled: true,
            storeAuthStateInCookie: true,
        }
    };

    return msalConfig;
}

export async function getRequest() {
    const config = await configPromise;
    const req: PopupRequest = { scopes: config.scopes };

    return req;
}
