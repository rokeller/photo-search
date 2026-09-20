import Typography from '@mui/material/Typography';
import { PhotoOverlayOffsetSpace } from './PhotoCommon';

interface PhotoIndexProps {
    index: number;
}

export function PhotoIndex({ index }: PhotoIndexProps) {
    return (
        <Typography variant='h6' sx={(theme) => ({
            position: 'absolute',
            top: theme.spacing(PhotoOverlayOffsetSpace),
            left: theme.spacing(PhotoOverlayOffsetSpace),
            textShadow: '1px 1px black',
        })}>{index + 1}</Typography>
    );
}
