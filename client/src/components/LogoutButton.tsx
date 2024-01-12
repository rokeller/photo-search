import { IPublicClientApplication } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import './LogoutButton.css';

async function handleLogout(instance: IPublicClientApplication) {

    try {
        await instance.logoutPopup();
    } catch (e) {
        console.error('logout failed', e);
    }
}

export function LogoutButton() {
    const { instance } = useMsal();

    return (
        <span className='ms-auto pointer logout-btn' title='Logout'
            onClick={() => handleLogout(instance)}>
            <svg width="28px" height="28px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g strokeWidth="0" />
                <g strokeLinecap="round" strokeLinejoin="round" />
                <g>
                    <path d="M21 12L13 12" stroke="#cccccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M18 15L20.913 12.087V12.087C20.961 12.039 20.961 11.961 20.913 11.913V11.913L18 9" stroke="#cccccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 5V4.5V4.5C16 3.67157 15.3284 3 14.5 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H14.5C15.3284 21 16 20.3284 16 19.5V19.5V19" stroke="#cccccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </g>
            </svg>
        </span>
    );
}
