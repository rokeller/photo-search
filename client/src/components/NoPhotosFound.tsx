import Box from '@mui/material/Box';

export function NoPhotosFound() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', }}>
            No photos found. If you have filters set, try changing or removing them.
        </Box>
    );
}
