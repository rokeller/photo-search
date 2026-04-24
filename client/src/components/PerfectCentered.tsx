import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import React from 'react';

export default function PerfectCentered({ children }: React.PropsWithChildren) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', }}>
            <Stack direction='column' sx={{ justifyContent: 'space-between', }}>
                {children}
            </Stack>
        </Box>
    );
}
