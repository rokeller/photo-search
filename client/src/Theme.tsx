import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { msalConfig } from './services/AuthConfig';

const theme = createTheme({
    palette: {
        mode: 'dark',
    },
});

export function Theme({ children }: React.PropsWithChildren) {
    const msalInstance = new PublicClientApplication(msalConfig)
    return (
        <ThemeProvider theme={theme} disableTransitionOnChange>
            <CssBaseline enableColorScheme />
            <Box
                sx={(theme) => ({
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
                <MsalProvider instance={msalInstance}>{children}</MsalProvider>
            </Box>
        </ThemeProvider>
    );
}
