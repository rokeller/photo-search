import { useEffect, useRef, useState } from 'react';
import { PhotoContainer } from '.';
import { PhotoResultItem, PhotoResultsResponse, PhotoService } from '../services';

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

function searchPhotos({ query }: SearchProps, offset?: number) {
    return PhotoService.search({ query, offset, limit: LIMIT });
}

function recommendPhotos({ photoId }: RecommendProps, offset?: number) {
    return PhotoService.recommend({ photoId, offset, limit: LIMIT });
}

export const SearchPhotoResults = PhotoResultsFactory<SearchProps>(searchPhotos);
export const SimilarPhotoResults = PhotoResultsFactory<RecommendProps>(recommendPhotos);
