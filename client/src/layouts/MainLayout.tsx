import { Outlet } from 'react-router-dom';
import './Layout.css';

const version = import.meta.env.VITE_APP_VERSION || 'under-development';

export default function MainLayout() {
    return <>
        <Outlet />

        <div className='footer'>
            <span>&copy; {new Date().getFullYear()}&nbsp;</span>
            <a href='https://flrx39.net' target='_blank'>{' '}flrx39.net </a>
            <span>&nbsp;| {version}</span>
        </div>
    </>;
}
