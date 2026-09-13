import Box from '@mui/material/Box';
import { Outlet } from 'react-router';


export default function PhotosLayout() {
    return (
        <Box sx={{ px: 1, py: 9, }}>
            <Outlet />
        </Box>
    );
}
