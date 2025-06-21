import { IPublicClientApplication } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import Button from '@mui/material/Button';
import { getRequest } from '../services/AuthConfig';

async function handleLogin(instance: IPublicClientApplication) {
    try {
        const req = await getRequest();
        const res = await instance.loginPopup(req)
        if (null == instance.getActiveAccount()) {
            instance.setActiveAccount(res.account);
            console.log('active account', instance.getActiveAccount());
        }
    } catch (e) {
        console.error('login failed', e);
    }
}

export default function LoginButton() {
    const { instance } = useMsal();

    return (
        <Button fullWidth variant='outlined'
            onClick={() => handleLogin(instance)}>
            Login now
        </Button>
    );
}
