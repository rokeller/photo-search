import React from 'react';
import { useAccessToken } from './AuthConfig';
import { isErrorResponse, PhotoSearchError } from './Errors';
import { PhotoService } from './PhotoService';

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
    private readonly accessToken: string;
    private readonly photoService = PhotoService;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
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

        if (this.accessToken) {
            headers['authorization'] = 'Bearer ' + this.accessToken;
        } else {
            console.error('failed to find an access token.');
        }

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
}

function factory(accessToken: string): Http {
    return new HttpImpl(accessToken);
}

type ResolveFn = (value: Http | PromiseLike<Http>) => void;
type RejectFn = (reason?: unknown) => void;

export function useHttpService(): Promise<Http> {
    const accessTokenPromise = useAccessToken();
    const promiseRef = React.useRef<null | Promise<Http>>(null);
    const resolveRef = React.useRef<null | ResolveFn>(null);
    const rejectRef = React.useRef<null | RejectFn>(null);

    if (promiseRef.current === null) {
        promiseRef.current = new Promise<Http>((resolve, reject) => {
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

        accessTokenPromise
            .then((accessToken) => resolveRef.current!(factory(accessToken)))
            .catch((error) => {
                console.error('failed to get access token for HTTP service', error);
                rejectRef.current!(new Error('failed to get access token for HTTP service'));
            });
    }, [accessTokenPromise]);

    // eslint-disable-next-line react-hooks/refs
    return promiseRef.current;
}
