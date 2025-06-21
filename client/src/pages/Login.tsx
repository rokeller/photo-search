import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import LoginButton from '../components/LoginButton';
import PerfectCentered from '../components/PerfectCentered';

export default function Login() {
    return (
        <PerfectCentered>
            <Card variant='outlined' sx={(theme) => ({ padding: theme.spacing(6), })}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography sx={{ textAlign: 'center' }} variant='h6'>
                        You're not logged in.
                    </Typography>

                    <LoginButton />

                    <Typography sx={{ textAlign: 'center' }} variant='body2' mt={2}>
                        &copy; 2023 - {new Date().getFullYear()} by flrx39.net
                    </Typography>
                </Box>
            </Card>
        </PerfectCentered>
    );
}
