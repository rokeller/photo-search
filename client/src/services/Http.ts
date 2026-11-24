import { InteractionRequiredAuthError, IPublicClientApplication } from '@azure/msal-browser';
import { isErrorResponse, PhotoSearchError } from './Errors';
import { PhotoService } from './PhotoService';
import React from 'react';

interface QueryPhotosRequest {
    query: string;
    limit?: number;
    offset?: number;
}

interface RecommendSimilarPhotosRequest {
    photoId: string;
    limit?: number;
    offset?: number;
}

export interface PhotoResultsResponse {
    items: Array<PhotoResultItem>;
}

export interface PhotoResultItem {
    id: string;
    path?: string;
    timestamp?: number;
}

export interface Http {
    search(r: QueryPhotosRequest): Promise<PhotoResultsResponse>;
    recommend(r: RecommendSimilarPhotosRequest): Promise<PhotoResultsResponse>;
    getPhotoSrc(id: string, width?: number): string;
    getPhoto(id: string, width?: number): Promise<string>;
    removeFromIndex(id: string): Promise<void>;
}

class HttpImpl implements Http {
    private readonly msalInstance: IPublicClientApplication;
    private readonly photoService = PhotoService;

    constructor(msalInstance: IPublicClientApplication) {
        this.msalInstance = msalInstance;
    }

    public async search({ query, limit, offset }: QueryPhotosRequest) {
        const resp = await this.fetch('/api/v1/photos/search', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                query,
                limit,
                offset,
                filter: this.photoService.getSearchFilter(),
            })
        });

        async function extractContent(resp: Response) {
            return (await resp.json()) as PhotoResultsResponse;
        }

        return await this.handleResponseErrors(resp, extractContent);
    }

    public async recommend({ photoId, limit, offset }: RecommendSimilarPhotosRequest) {
        const resp = await this.fetch('/api/v1/photos/recommend', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                id: photoId,
                limit,
                offset,
                filter: this.photoService.getRecommendFilter(),
            })
        });

        async function extractContent(resp: Response) {
            return (await resp.json()) as PhotoResultsResponse;
        }

        return await this.handleResponseErrors(resp, extractContent);
    }

    public getPhotoSrc(id: string, width?: number) {
        let url = '/api/v1/photos/' + encodeURIComponent(id);
        if (width !== undefined) {
            url += '/' + encodeURIComponent(width);
        }

        return url;
    }

    public async getPhoto(id: string, width?: number) {
        const url = this.getPhotoSrc(id, width);
        const resp = await this.fetch(url);

        async function extractContent(resp: Response) {
            const blob = await resp.blob();
            return URL.createObjectURL(blob);
        }

        return await this.handleResponseErrors(resp, extractContent);
    }

    public async removeFromIndex(id: string) {
        const resp = await this.fetch('/api/v1/photos/' + id + '/index', {
            method: 'DELETE',
        });
        await this.handleResponseErrors(resp, Promise.resolve);
    }

    private async fetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const finalInit: RequestInit = init || {};
        const authHeaders = await this.authenticateRequest();

        finalInit.headers = { ...(finalInit.headers || {}), ...authHeaders };

        const resp = await fetch(url, finalInit);
        return resp;
    }

    private async authenticateRequest() {
        const headers: Record<string, string> = {};
        const accessToken = await this.getAccessToken();

        if (!accessToken) {
            throw new Error('failed to acquire access token');
        }

        headers['authorization'] = 'Bearer ' + accessToken;
        return headers;
    }

    private async handleResponseErrors<TResponse>(
        resp: Response,
        extractContent: (resp: Response) => Promise<TResponse>
    ): Promise<TResponse> {
        switch (resp.status) {
            case 200:
            case 202:
                return extractContent(resp);

            case 500:
                {
                    const err = (await resp.text());
                    throw new Error('request failed (status 500): ' + err);
                }

            case 503:
                {
                    const err = (await resp.json());
                    if (isErrorResponse(err)) {
                        throw new PhotoSearchError(err.code, err.message);
                    } else {
                        throw new Error('request failed (status 503): ' + err.error);
                    }
                }

            default:
                throw new Error('unknown error: ' + resp.status);
        }
    }

    private async getAccessToken(): Promise<string | null> {
        const accts = this.msalInstance.getAllAccounts();
        const accessTokenRequest = {
            scopes: globalThis.photoSearch.auth.scopes,
            account: accts.length > 0 && accts[0] || undefined,
        };

        try {
            const tokenResponse = await this.msalInstance.acquireTokenSilent(accessTokenRequest);
            return tokenResponse.accessToken;
        } catch (error: unknown) {
            // Fallback to interactive method if silent acquisition fails
            if (error instanceof InteractionRequiredAuthError) {
                console.debug('try acquiring token with redirect');
                await this.msalInstance.acquireTokenRedirect(accessTokenRequest);
                console.debug('finished acquiring token with redirect');
            }
            console.warn('silent token acquisition failed:', error);
            return null;
        }
    }
}

export function useHttp(msalInstance: IPublicClientApplication): React.RefObject<Http> {
    const httpRef = React.useRef<Http>(new HttpImpl(msalInstance));
    return httpRef;
}
