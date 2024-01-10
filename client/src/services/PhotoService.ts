import { InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser';
import { getMsalConfig, getRequest } from './AuthConfig';

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
}

interface ApiFilter {
    notBefore?: number;
    notAfter?: number;
    onThisDay?: number;
}

function extractDateValue(dt: Date | undefined): number | undefined {
    if (dt === undefined) {
        return undefined;
    }

    return dt.valueOf() / 1000;
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
    private filter?: ApiFilter = {};

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
            this.filter = {
                notBefore: extractDateValue(filter?.notBefore),
                notAfter: extractDateValue(filter?.notAfter),
                onThisDay: extractDateValue(filter.onThisDay),
            };
        } else {
            this.filter = undefined;
        }

        if (!Object.is(oldFilter, filter)) {
            const ev = new CustomEvent('photoFilterChanged', {
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

    public hasFilter() {
        return this.uiFilter !== undefined &&
            (
                this.uiFilter.notBefore !== undefined ||
                this.uiFilter.notAfter !== undefined ||
                this.uiFilter.onThisDay !== undefined
            );
    }

    public async search({ query, limit, offset }: QueryPhotosRequest) {
        const resp = await fetch('/api/v1/photos/search', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({ query, limit, offset, filter: this.filter, })
        });

        const result = (await resp.json()) as PhotoResultsResponse;

        return result;
    }

    public async recommend({ photoId, limit, offset }: RecommendSimilarPhotosRequest) {
        const resp = await fetch('/api/v1/photos/recommend', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({ id: photoId, limit, offset, filter: this.filter, })
        });

        const result = (await resp.json()) as PhotoResultsResponse;

        return result;
    }

    public getPhotoSrc(id: string, width?: number) {
        let url = '/api/v1/photos/' + encodeURIComponent(id);
        if (width !== undefined) {
            url += '/' + encodeURIComponent(width);
        }

        return url;
    }

    public async getMsalInstance() {
        return await this.msalAppPromise;
    }
}

export const PhotoService = new PhotoServiceImpl();
