import { IPublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { PhotoService } from './services/PhotoService.ts'

function AppProxyWithMsal() {
    const [msal, setMsal] = useState<IPublicClientApplication>();

    useEffect(() => {
        async function load() {
            const msal = await PhotoService.getMsalInstance();
            setMsal(msal);
        }

        load();
    })

    if (msal === undefined) {
        return <div className='perfect-center'>
            Please wait ...
        </div>;
    }

    return (
        <MsalProvider instance={msal}>
            <App />
        </MsalProvider>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AppProxyWithMsal />
    </React.StrictMode>,
)
