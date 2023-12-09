interface QueryPhotosRequest {
    query: string;
    limit?: number;
    offset?: number;
}

interface RecommendSimilarPhotosRequest {
    id: string;
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
    cam?: string;
    score?: number;
}

class PhotoServiceImpl {
    public async search({ query, limit, offset }: QueryPhotosRequest) {
        const resp = await fetch('/api/v1/photos/search', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({ query, limit, offset })
        });

        const result = (await resp.json()) as PhotoResultsResponse;

        return result;
    }

    public async recommend({ id, limit, offset }: RecommendSimilarPhotosRequest) {
        const resp = await fetch('/api/v1/photos/recommend', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({ id, limit, offset })
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
}

export const PhotoService = new PhotoServiceImpl();
