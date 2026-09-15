import { useMsal } from '@azure/msal-react';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import IconButton from '@mui/material/IconButton';

export function LogoutButton() {
    const { instance } = useMsal();

    async function handleLogout() {
        try {
            await instance.clearCache();
            location.reload();
        } catch (e) {
            console.error('logout failed', e);
        }
    }

    return (
        <IconButton aria-label='logout' title='Logout' size='large'
            onClick={handleLogout}>
            <LogoutOutlinedIcon />
        </IconButton>
    );
}
