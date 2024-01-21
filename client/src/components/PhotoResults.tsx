import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { PhotoContainer } from '.';
import { PhotoResultItem, PhotoResultsResponse, PhotoService, isErrorResponse } from '../services';

const LIMIT = 12;
type RetrieveFn<T> = (props: T, offset?: number) => Promise<PhotoResultsResponse>;

function PhotoResultsFactory<TProps>(retrieveFn: RetrieveFn<TProps>) {
    const Component = (props: TProps) => {
        const isUpdating = useRef(false);
        const [photos, setPhotos] = useState<Array<PhotoResultItem>>();

        const updatePhotos = async (offset?: number) => {
            if (isUpdating.current) {
                return;
            }

            isUpdating.current = true;
            try {
                const response = await retrieveFn(props, offset);
                if (response) {
                    if (offset === undefined || offset <= 0) {
                        // Overwrite the previous set of photos.
                        setPhotos(response.items);
                    } else {
                        // Append to the previous set of photos.
                        setPhotos([...(photos || []), ...response.items]);
                    }
                }
            } finally {
                isUpdating.current = false;
            }
        };

        const doLoadMore = () => {
            // It's really pointless to load more photos unless we already have
            // photos.
            if (photos) {
                updatePhotos(photos?.length);
            }
        };

        useEffect(() => {
            // The props have changed, which means the driving factor for the
            // retrieveFn has changed. That implies that we move to a new result
            // set, which is why we should move to the beginning of the page
            // again.
            window.scrollTo({ top: 0 });
            updatePhotos();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [props]);

        useEffect(() => {
            const onFilterChanged = () => {
                // The filter has changed, so we need to start at the top again
                // and fetch a new result set.
                window.scrollTo({ top: 0 });
                updatePhotos();
            };

            PhotoService.subscribe('photoFilterChanged', onFilterChanged);

            return () => {
                PhotoService.unsubscribe('photoFilterChanged', onFilterChanged);
            }
        });

        return <PhotoContainer photos={photos} onLoadMore={doLoadMore} />;
    }

    return Component;
}

interface SearchProps {
    query: string;
}

interface RecommendProps {
    photoId: string;
}

interface ErrorProps {
    error: unknown;
}

function SearchError({ error }: ErrorProps) {
    const errorCode = isErrorResponse(error) ? error.code : undefined;
    return <>
        <strong>Search is not available right now.</strong>
        <div>
            Please try again later, or report this issue to your
            administrator.
        </div>
        <div>Error: <code>{errorCode}</code></div>
    </>;
}

function RecommendError({ error }: ErrorProps) {
    const errorCode = isErrorResponse(error) ? error.code : undefined;
    return <>
        <strong>Recommendations are not available right now.</strong>
        <div>
            Please try again later, or report this issue to your
            administrator.
        </div>
        <div>Error: <code>{errorCode}</code></div>
    </>;
}

async function searchPhotos({ query }: SearchProps, offset?: number): Promise<PhotoResultsResponse> {
    try {
        return await PhotoService.search({ query, offset, limit: LIMIT });
    } catch (e) {
        toast.error(<SearchError error={e} />);
        return { items: [] };
    }
}

async function recommendPhotos({ photoId }: RecommendProps, offset?: number): Promise<PhotoResultsResponse> {
    try {
        return await PhotoService.recommend({ photoId, offset, limit: LIMIT });
    } catch (e) {
        toast.error(<RecommendError error={e} />);
        return { items: [] };
    }
}

export const SearchPhotoResults = PhotoResultsFactory<SearchProps>(searchPhotos);
export const SimilarPhotoResults = PhotoResultsFactory<RecommendProps>(recommendPhotos);
