import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import React from 'react';
import { PhotoService } from '../services';
import PhotoWithRetry from './PhotoWithRetry';

interface ViewPhotoProps {
    photoId: string;
    hide: () => void;
}

export default function ViewPhoto({ photoId, hide }: ViewPhotoProps) {
    // A photoUrl of undefined means that we couldn't load the photo but we can try again.
    const [photoUrl, setPhotoUrl] = React.useState<string | undefined>('/please-wait.svg');
    const loadPhoto = async () => {
        try {
            const url = await PhotoService.getPhoto(photoId);
            setPhotoUrl(url);
        } catch (e) {
            console.error('failed to load photo', e);
            setPhotoUrl(undefined);
        }
    };

    React.useEffect(() => {
        loadPhoto();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [photoId]);

    return (
        <Paper sx={{ p: 1, width: '100vw', height: '100vh', }}>
            <Box display='flex' justifyContent='center' width='100%' height='100%'>
                <PhotoWithRetry preview={false} photoUrl={photoUrl} onRetry={loadPhoto} />
            </Box>
            <Button aria-label='close' onClick={hide} color='secondary'
                variant='outlined' endIcon={<CloseIcon />} sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                }}>
                Close
            </Button>
        </Paper>
    );
}
