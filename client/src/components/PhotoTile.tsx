import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import React from 'react';
import { isMidnight } from '../services/DateUtils';
import { PhotoResultItem, useHttpService } from '../services/Http';
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
    const httpPromise = useHttpService();
    const timestamp = details.timestamp ? new Date(details.timestamp * 1000) : undefined;
    // A photoUrl of undefined means that we couldn't load the photo but we can try again.
    const [photoUrl, setPhotoUrl] = React.useState<string | undefined>('/please-wait.svg');

    const loadPhoto = React.useCallback(async () => {
        const http = await httpPromise;
        try {
            return await http.getPhoto(details.id, 480);
        } catch (e) {
            console.error('failed to load photo', e);
            return undefined;
        }
    }, [details.id, httpPromise]);

    React.useEffect(() => {
        let ignore = false;
        loadPhoto()
            .then((url) => {
                if (!ignore) {
                    setPhotoUrl(url);
                }
            })
            .catch((e) => {
                console.error('failed to get photo URL', e);
                if (!ignore) {
                    setPhotoUrl(undefined);
                }
            })
            ;
        return () => {
            ignore = true;
        };
    }, [loadPhoto]);

    const timestampLegend = timestamp ?
        <PhotoTimestamp timestamp={timestamp} dateOnly={isMidnight(timestamp)} />
        : null;

    return (
        <Paper>
            <Stack direction='column' sx={{ justifyContent: 'center', }}>
                <Box sx={{ position: 'relative', textAlign: 'center', }}>
                    <PhotoWithRetry details={details} photoUrl={photoUrl}
                        preview onClick={onView} onRetry={loadPhoto} />
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
