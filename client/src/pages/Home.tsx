import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PerfectCentered from '../components/PerfectCentered';

export default function Home() {
    return (
        <PerfectCentered>
            <Box padding={2}>
                <Typography component='h1' variant='h4'>
                    Welcome to Photo Search.
                </Typography>
                <Typography variant='body1'>
                    Use the search box on the top to start exploring your photos.
                </Typography>
            </Box>
        </PerfectCentered>
    );
}
