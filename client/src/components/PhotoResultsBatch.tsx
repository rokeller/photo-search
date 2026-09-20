import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import React from 'react';
import { toast } from 'react-toastify';
import { Http, PhotoResultItem, PhotoResultsResponse, useHttpService } from '../services/Http';
import { NoPhotosFound } from './NoPhotosFound';
import { LIMIT, RetrieveFn } from './PhotoCommon';
import PhotoTile from './PhotoTile';
import { RecommendError } from './RecommentError';
import { SearchError } from './SearchError';

export interface SearchProps {
    query: string;
}

export interface RecommendProps {
    photoId: string;
}

export interface PhotoResultsBatchProps<TProps> {
    offset: number;
    onNoMore: () => void;
    showPhoto: (photoId: string) => void;
    input: TProps;
}

async function fetchPhotos<TProps>(
    httpPromise: Promise<Http>,
    offset: number,
    props: TProps,
    retrieveFn: RetrieveFn<TProps>,
) {
    const http = await httpPromise;
    const response = await retrieveFn(http, props, offset);
    if (response) {
        return response.items;
    }
}

function PhotoResultsBatchFactory<TProps>(retrieveFn: RetrieveFn<TProps>) {
    const Component = ({ offset, onNoMore, showPhoto, input: props }: PhotoResultsBatchProps<TProps>) => {
        const httpPromise = useHttpService();
        const [photos, setPhotos] = React.useState<Array<PhotoResultItem>>();

        React.useEffect(() => {
            let ignore = false;
            fetchPhotos(httpPromise, offset, props, retrieveFn)
                .then((items) => {
                    if (!ignore) {
                        if (items && items.length < LIMIT) {
                            onNoMore();
                        }
                        setPhotos(items);
                    }
                })
                .catch((e) => {
                    console.error('failed to get fetch photos of batch', offset, e);
                    if (!ignore) {
                        setPhotos(undefined);
                    }
                });

            return () => {
                ignore = true;
            };
        }, [offset, onNoMore, props, httpPromise]);

        const items = (photos === undefined) ?
            new Array(LIMIT).fill(0).map((_, index) => (
                <Paper key={'skeleton-' + index}>
                    <Stack direction='column'>
                        <Skeleton variant='rectangular' height={300} />
                        <Box>
                            <Skeleton variant='text' />
                            <Skeleton variant='text' width='60%' />
                        </Box>
                    </Stack>
                </Paper>
            ))
            : (offset === 0 && photos.length === 0 ?
                <NoPhotosFound />
                :
                photos.map((item, index) => (
                    <PhotoTile key={(offset + index) + '-' + item.id} details={item}
                        resultIndex={offset + index} onView={() => showPhoto(item.id)} />
                )));

        return (<>{items}</>);
    };

    return Component;
}

async function searchPhotos(http: Http, { query }: SearchProps, offset?: number): Promise<PhotoResultsResponse> {
    try {
        return await http.search({ query, offset, limit: LIMIT });
    } catch (e) {
        toast.error(<SearchError error={e} />);
        return { items: [] };
    }
}

async function recommendPhotos(http: Http, { photoId }: RecommendProps, offset?: number): Promise<PhotoResultsResponse> {
    try {
        return await http.recommend({ photoId, offset, limit: LIMIT });
    } catch (e) {
        toast.error(<RecommendError error={e} />);
        return { items: [] };
    }
}

export const SearchPhotoResultsBatch = PhotoResultsBatchFactory<SearchProps>(searchPhotos);
export const SimilarPhotoResultsBatch = PhotoResultsBatchFactory<RecommendProps>(recommendPhotos);
