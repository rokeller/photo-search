import { InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser';
import { getMsalConfig, getRequest } from './AuthConfig';
import { PhotoSearchError, isErrorResponse } from './Errors';

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

enum PhotoEventNames {
    PhotoFilterChanged = 'photoFilterChanged',
}

type PhotoFilterChanged = 'photoFilterChanged';
type PhotoEvents = PhotoFilterChanged;

export interface PhotoFilterChangedEvent {
    old?: PhotoFilter;
    new?: PhotoFilter;
}

export interface PhotoFilter {
    notBefore?: Date;
    notAfter?: Date;
    onThisDay?: Date;

    minScoreSearch?: number;
    minScoreSimilar?: number;
}

interface ApiFilter {
    notBefore?: number;
    notAfter?: number;
    onThisDay?: number;

    minScore?: number;
}

function extractTimestampValue(dt: Date | undefined): number | undefined {
    if (dt === undefined) {
        return undefined;
    }

    return dt.valueOf() / 1000;
}

function makeThisYear(dt: Date | undefined) {
    if (dt === undefined) {
        return undefined;
    }

    const isoStr = dt.toISOString();
    const monthAndDay = isoStr.substring(4, 4 /*year*/ + 2 /*month*/ + 2 /*day*/ + 2 /*dashes*/);
    const year = new Date().getFullYear();
    return new Date(year + monthAndDay + 'T00:00:00Z')
}

async function initMsalInstance() {
    const config = await getMsalConfig();
    const instance = new PublicClientApplication(config);

    await instance.initialize();

    return instance;
}

class PhotoServiceImpl {
    private readonly msalAppPromise = initMsalInstance();

    private uiFilter?: PhotoFilter = {};
    private filterSearch?: ApiFilter = {};
    private filterRecommend?: ApiFilter = {};

    public subscribe(
        eventName: PhotoEvents,
        listener: EventListenerOrEventListenerObject
    ) {
        document.addEventListener(eventName, listener);
    }

    public unsubscribe(
        eventName: PhotoEvents,
        listener: EventListenerOrEventListenerObject
    ) {
        document.removeEventListener(eventName, listener);
    }

    public setFilter(filter?: PhotoFilter) {
        const oldFilter = this.uiFilter;

        this.uiFilter = filter;
        if (filter !== undefined) {
            this.filterSearch = {
                notBefore: extractTimestampValue(filter?.notBefore),
                notAfter: extractTimestampValue(filter?.notAfter),
                onThisDay: extractTimestampValue(makeThisYear(filter.onThisDay)),
                minScore: filter.minScoreSearch,
            };
            this.filterRecommend = {
                notBefore: extractTimestampValue(filter?.notBefore),
                notAfter: extractTimestampValue(filter?.notAfter),
                onThisDay: extractTimestampValue(makeThisYear(filter.onThisDay)),
                minScore: filter.minScoreSimilar,
            };
        } else {
            this.filterSearch = this.filterRecommend = undefined;
        }

        if (!Object.is(oldFilter, filter)) {
            const ev = new CustomEvent(PhotoEventNames.PhotoFilterChanged, {
                detail: {
                    old: oldFilter,
                    new: filter,
                },
            });
            document.dispatchEvent(ev);
        }
    }

    public getFilter() {
        return this.uiFilter;
    }

    public filtersCount() {
        if (this.uiFilter !== undefined) {
            return [
                this.uiFilter.minScoreSearch !== undefined,
                this.uiFilter.minScoreSimilar !== undefined,
                this.uiFilter.notBefore !== undefined,
                this.uiFilter.notAfter !== undefined,
                this.uiFilter.onThisDay !== undefined,
            ].filter((isSet) => isSet).length;
        }
        return 0;
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
                filter: this.filterSearch,
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
            body: JSON.stringify({ id: photoId, limit, offset, filter: this.filterRecommend, })
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

    public async getMsalInstance() {
        return await this.msalAppPromise;
    }

    private async fetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const finalInit: RequestInit = init || {};
        const authHeaders = await this.authenticateRequest();

        finalInit.headers = { ...(finalInit.headers || {}), ...authHeaders };

        const resp = await fetch(url, finalInit);
        return resp;
    }

    private async authenticateRequest() {
        let accessToken: string | null = null;
        const headers: Record<string, string> = {};

        const msalInstance = await this.msalAppPromise;
        const request = await getRequest();

        try {
            const response = await msalInstance.acquireTokenSilent(request);
            accessToken = response?.accessToken;
        } catch (error) {
            console.error('failed to silently get a new token.', error, error instanceof InteractionRequiredAuthError);
            const response = await msalInstance.acquireTokenPopup(request);
            accessToken = response?.accessToken;
        }

        if (accessToken) {
            headers['authorization'] = 'Bearer ' + accessToken;
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

export const PhotoService = new PhotoServiceImpl();
