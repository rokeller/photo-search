import { useMsal } from '@azure/msal-react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import React from 'react';
import { isMidnight } from '../services/DateUtils';
import { PhotoResultItem, useHttp } from '../services/Http';
import { PhotoActions } from './PhotoActions';
import { PhotoIndex } from './PhotoIndex';
import { PhotoPath } from './PhotoPath';
import { PhotoTimestamp } from './PhotoTimestamp';
import PhotoWithRetry from './PhotoWithRetry';

interface PhotoTileProps {
    resultIndex: number;
    details: PhotoResultItem;
    onView?: () => void;
}

export default function PhotoTile({ details, resultIndex, onView }: PhotoTileProps) {
    const { instance } = useMsal();
    const http = useHttp(instance);
    const timestamp = details.timestamp ? new Date(details.timestamp * 1000) : undefined;
    // A photoUrl of undefined means that we couldn't load the photo but we can try again.
    const [photoUrl, setPhotoUrl] = React.useState<string | undefined>('/please-wait.svg');

    React.useEffect(() => {
        let blobUrl: string | undefined;

        async function loadPhoto() {
            try {
                const url = await http.current.getPhoto(details.id);
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
            }
        };
    }, [http, details.id]);

    const timestampLegend = timestamp ?
        <PhotoTimestamp timestamp={timestamp} dateOnly={isMidnight(timestamp)} />
        : null;

    return (
        <Paper>
            <Stack direction='column' sx={{ justifyContent: 'center', }}>
                <Box sx={{ position: 'relative', textAlign: 'center', }}>
                    <PhotoWithRetry details={details} photoUrl={photoUrl}
                        preview onClick={onView} />
                    <PhotoIndex index={resultIndex} />
                    <PhotoActions photoId={details.id} timestamp={timestamp} />
                </Box>
                <Box sx={(theme) => ({ p: theme.spacing(1) })}>
                    <PhotoPath path={details.path!} />
                    {timestampLegend}
                </Box>
            </Stack>
        </Paper >
    );
}
