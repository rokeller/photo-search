import Dialog from '@mui/material/Dialog';
import React from 'react';
import { LIMIT } from './PhotoCommon';
import PhotoContainer from './PhotoContainer';
import {
    PhotoResultsBatchProps, RecommendProps, SearchPhotoResultsBatch,
    SearchProps, SimilarPhotoResultsBatch,
} from './PhotoResultsBatch';
import ViewPhoto from './ViewPhoto';

function PhotoResultsFactory<TProps>(BatchComponent: React.FC<PhotoResultsBatchProps<TProps>>) {
    const Component = (props: TProps) => {
        const [offset, setOffset] = React.useState(LIMIT);
        const [noMore, setNoMore] = React.useState(false);
        const [batches, setBatches] = React.useState<React.ReactNode[]>(
            [<BatchComponent key={'offset-0'} offset={0}
                onNoMore={() => setNoMore(true)}
                showPhoto={showPhoto}
                input={props} />]
        );
        const [photoId, setPhotoId] = React.useState<string>();

        const doLoadMore = React.useCallback(async () => {
            if (!noMore) {
                setBatches((prev) => [
                    ...prev,
                    <BatchComponent key={'offset-' + offset} offset={offset}
                        onNoMore={() => setNoMore(true)}
                        showPhoto={showPhoto}
                        input={props} />
                ]);
                setOffset((prev) => prev + LIMIT);
            }
        }, [props, offset, noMore]);

        React.useEffect(() => {
            window.scrollTo({ top: 0 });
        }, [props]);

        function showPhoto(photoId: string) {
            setPhotoId(photoId);
        }

        function hidePhoto() {
            setPhotoId(undefined);
        }

        const viewPhoto = photoId !== undefined ?
            (
                <Dialog open onClose={hidePhoto} fullScreen hideBackdrop>
                    <ViewPhoto key={photoId} photoId={photoId} hide={hidePhoto} />
                </Dialog>
            )
            : null;

        return (
            <>
                <PhotoContainer onLoadMore={doLoadMore}>{batches}</PhotoContainer>
                {viewPhoto}
            </>
        );
    }

    return Component;
}

export const SearchPhotoResults = PhotoResultsFactory<SearchProps>(SearchPhotoResultsBatch);
export const SimilarPhotoResults = PhotoResultsFactory<RecommendProps>(SimilarPhotoResultsBatch);
