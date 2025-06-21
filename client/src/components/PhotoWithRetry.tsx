import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { PhotoResultItem } from '../services';

interface PhotoWithRetryProps {
    preview: boolean;
    details?: PhotoResultItem;
    photoUrl: string | undefined;
    onClick?: () => void;
    onRetry: () => void;
}

const PhotoPreview = styled('img')({
    maxWidth: '100%',
    maxHeight: '360px',
    textAlign: 'center',
});

const Photo = styled('img')({
    maxWidth: '100%',
    maxHeight: '100%',
    width: 'auto',
    height: 'auto',
});

export default function PhotoWithRetry({ preview, details, photoUrl, onClick, onRetry }: PhotoWithRetryProps) {
    if (photoUrl === undefined) {
        return (
            <Stack height={360} direction='column' justifyContent='center'>
                <Typography variant='body2'>Failed to load preview.</Typography>
                <Box>
                    <Button variant='outlined' size='small' onClick={onRetry}>Retry</Button>
                </Box>
            </Stack>
        );
    } else if (preview) {
        return (
            <PhotoPreview src={photoUrl} title={details?.path}
                onClick={() => onClick ? onClick() : null} />
        );
    } else {
        return (
            <Photo src={photoUrl} title={details?.path}
                onClick={() => onClick ? onClick() : null} />
        );
    }
}
