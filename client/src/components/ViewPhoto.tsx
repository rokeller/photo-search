import { useMsal } from '@azure/msal-react';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import React from 'react';
import { useHttp } from '../services/Http';
import PhotoWithRetry from './PhotoWithRetry';

interface ViewPhotoProps {
    photoId: string;
    hide: () => void;
}

export default function ViewPhoto({ photoId, hide }: ViewPhotoProps) {
    const { instance } = useMsal();
    const http = useHttp(instance);
    // A photoUrl of undefined means that we couldn't load the photo but we can try again.
    const [photoUrl, setPhotoUrl] = React.useState<string | undefined>('/please-wait.svg');

    React.useEffect(() => {
        let blobUrl: string | undefined;

        async function loadPhoto() {
            try {
                const url = await http.current.getPhoto(photoId);
                blobUrl = url;
                setPhotoUrl(url);
            } catch (e: unknown) {
                console.error('failed to load photo', e);
                blobUrl = undefined;
                setPhotoUrl(undefined);
            }
        }
        loadPhoto();

        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            };
        }
    }, [http, photoId]);

    return (
        <Paper sx={{ p: 1, width: '100vw', height: '100vh', }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%', }}>
                <PhotoWithRetry preview={false} photoUrl={photoUrl} />
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
