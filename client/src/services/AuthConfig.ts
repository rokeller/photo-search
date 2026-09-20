import { BrowserCacheLocation, Configuration } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import React from 'react';

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

type ResolveFn = (value: string | PromiseLike<string>) => void;
type RejectFn = (reason?: unknown) => void;

export function useAccessToken(): Promise<string> {
    const { instance, accounts } = useMsal();
    const promiseRef = React.useRef<null | Promise<string>>(null);
    const resolveRef = React.useRef<null | ResolveFn>(null);
    const rejectRef = React.useRef<null | RejectFn>(null);

    if (promiseRef.current === null) {
        promiseRef.current = new Promise<string>((resolve, reject) => {
            if (resolveRef.current === null) {
                resolveRef.current = resolve;
            }
            if (rejectRef.current === null) {
                rejectRef.current = reject;
            }
        });
    }

    React.useEffect(() => {
        if (resolveRef.current === null || rejectRef.current === null) {
            console.warn('resolve and/or reject are not set yet', resolveRef.current, rejectRef.current);
            return;
        }
        if (accounts.length > 0) {
            instance
                .acquireTokenSilent({
                    account: accounts[0],
                    scopes: globalThis.photoSearch.auth.scopes,
                })
                .then((resp) => resolveRef.current!(resp.accessToken))
                .catch((error) => {
                    console.error('silen token acquisition failed', error);
                    instance.clearCache();
                    location.reload();
                    rejectRef.current!(new Error('not authenticated'));
                })
        } else {
            rejectRef.current(new Error('not authenticated'));
        }

    }, [instance, accounts]);

    // eslint-disable-next-line react-hooks/refs
    return promiseRef.current;
}
