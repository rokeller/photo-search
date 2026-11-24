import { BrowserCacheLocation, Configuration } from '@azure/msal-browser';

export const msalConfig: Configuration = {
    auth: {
        ...globalThis.photoSearch.auth,
        redirectUri: '/sso-redirect.html',
    },
    system: {
        protocolMode: 'OIDC',
    },
    cache: {
        cacheLocation: BrowserCacheLocation.SessionStorage,
    },
};
