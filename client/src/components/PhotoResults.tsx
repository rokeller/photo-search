import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PhotoContainer } from '.';
import { PhotoResultItem, PhotoResultsResponse, PhotoService } from '../services';

const LIMIT = 12;
type RetrieveFn<TParams> = (params: TParams, offset?: number) => Promise<PhotoResultsResponse>;

// for cancellation of pending queries:
// https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect

function PhotoResultsFactory<TParams>(retrieveFn: RetrieveFn<TParams>) {
    const Component = () => {
        const params = useParams<keyof TParams & string>() as TParams;
        const [photos, setPhotos] = useState<Array<PhotoResultItem>>();
        const [offset, setOffset] = useState<number>();

        function doLoadMore() {
            setOffset((offset || 0) + LIMIT);
        }

        const fetchNextPage = useCallback(async () => {
            const nextPage = await (await retrieveFn(params, offset)).items;
            setPhotos([...(photos || []), ...nextPage])
        }, [params, offset]);

        // When the params change:
        useEffect(() => {
            window.scrollTo({ top: 0 });
            setOffset(undefined);
            setPhotos([])
        }, [params]);

        // When the offset changes:
        useEffect(() => {
            if (offset === undefined) {
                setOffset(0);
            } else {
                fetchNextPage();
            }
        }, [offset]);

        if (photos) {
            return <PhotoContainer photos={photos} onLoadMore={doLoadMore} />;
        } else {
            return null;
        }
    }

    return Component;
}

interface SearchParams {
    query: string;
}

interface RecommendParams {
    photoId: string;
}

function searchPhotos(params: SearchParams, offset?: number) {
    return PhotoService.search({ query: params.query, offset, limit: LIMIT });
}

function recommendPhotos(params: RecommendParams, offset?: number) {
    return PhotoService.recommend({ id: params.photoId, offset, limit: LIMIT });
}

export const SearchPhotoResults = PhotoResultsFactory<SearchParams>(searchPhotos);
export const SimilarPhotoResults = PhotoResultsFactory<RecommendParams>(recommendPhotos);
