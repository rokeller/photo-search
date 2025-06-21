import { IPublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import CssBaseline from '@mui/material/CssBaseline'
import { createTheme, StyledEngineProvider, ThemeProvider } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import PerfectCentered from './components/PerfectCentered.tsx'
import { PhotoService } from './services/PhotoService.ts'

const theme = createTheme({
    palette: {
        mode: 'dark',
    },
});

// eslint-disable-next-line react-refresh/only-export-components
function AppProxyWithMsal() {
    const [msal, setMsal] = React.useState<IPublicClientApplication>();

    React.useEffect(() => {
        async function load() {
            const msal = await PhotoService.getMsalInstance();
            setMsal(msal);
        }

        load();
    })

    const content = msal === undefined ?
        <PerfectCentered>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} alignItems='center'>
                <CircularProgress />
                <Typography variant='body2'>
                    Please wait while we're setting things up
                </Typography>
            </Box>
        </PerfectCentered>
        :
        <MsalProvider instance={msal}><App /></MsalProvider>

    return (
        <ThemeProvider theme={theme} disableTransitionOnChange>
            <CssBaseline enableColorScheme />
            <Box sx={(theme) => ({
                '&::before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    zIndex: -1,
                    inset: 0,
                    backgroundImage:
                        'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
                    backgroundRepeat: 'no-repeat',
                    ...theme.applyStyles('dark', {
                        backgroundImage:
                            'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
                    }),
                }
            })}>
                {content}
            </Box>
        </ThemeProvider>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <StyledEngineProvider injectFirst>
            <AppProxyWithMsal />
        </StyledEngineProvider>
    </React.StrictMode>,
)
