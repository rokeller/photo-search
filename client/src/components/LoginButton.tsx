import { IPublicClientApplication } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import Button from '@mui/material/Button';

async function handleLogin(instance: IPublicClientApplication) {
    try {
        await instance.loginRedirect();
        if (null == instance.getActiveAccount()) {
            const acct = instance.getAccount({});
            instance.setActiveAccount(acct);
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
