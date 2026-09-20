import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import { StyledEngineProvider } from '@mui/material/styles'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { Theme } from './Theme.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <StyledEngineProvider injectFirst>
            <Theme><App /></Theme>
        </StyledEngineProvider>
    </React.StrictMode>,
)
