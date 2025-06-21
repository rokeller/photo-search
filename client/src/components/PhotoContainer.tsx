import Masonry from '@mui/lab/Masonry';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import React from 'react';
import { PhotoResultItem } from '../services';
import PhotoTile from './PhotoTile';
import ViewPhoto from './ViewPhoto';

interface PhotoContainerProps {
    photos?: Array<PhotoResultItem>;
    onLoadMore?: () => void;
}

export default function PhotoContainer({ photos, onLoadMore }: PhotoContainerProps) {
    const [photoId, setPhotoId] = React.useState<string>();

    React.useEffect(() => {
        function onScroll() {
            const endOfPage = window.innerHeight + window.scrollY >= document.body.offsetHeight;
            if (endOfPage && onLoadMore) {
                onLoadMore();
            }
        }

        window.addEventListener('scroll', onScroll);

        return () => {
            window.removeEventListener('scroll', onScroll);
        };
    });

    function showPhoto(photoId: string) {
        setPhotoId(photoId);
    }

    function hidePhoto() {
        setPhotoId(undefined);
    }

    if (photos && photos.length <= 0) {
        return (
            <Box display='flex' justifyContent='center'>
                No photos found. If you have filters set, try changing or removing them.
            </Box>
        )
    }

    const photoTiles = (photos === undefined) ?
        new Array(12).fill(0).map((_, index) => (
            <Paper key={'skeleton-' + index}>
                <Stack direction='column'>
                    <Skeleton variant='rectangular' height={360} />
                    <Box>
                        <Skeleton variant='text' />
                        <Skeleton variant='text' width='60%' />
                    </Box>
                </Stack>
            </Paper>
        ))
        : photos.map((item, index) => (
            <PhotoTile key={index + '-' + item.id} details={item}
                resultIndex={index} onView={() => showPhoto(item.id)} />
        ));

    const viewPhoto = photoId !== undefined ?
        (
            <Dialog open onClose={hidePhoto} fullScreen hideBackdrop>
                <ViewPhoto photoId={photoId} hide={hidePhoto} />
            </Dialog>
        )
        : null;

    return (
        <>
            <Masonry columns={{ xs: 1, sm: 2, md: 3, lg: 4, }} spacing={1}>
                {photoTiles}
            </Masonry>
            {viewPhoto}
        </>
    );
}
