import { Link, Outlet, useParams } from 'react-router-dom';
import faviconUrl from '../assets/favicon-96.png';
import { LogoutButton, PhotoFilterControls, SearchBox } from '../components';

interface PhotosLayoutParams {
    query?: string;
}

export default function PhotosLayout() {
    const { query } = useParams<keyof PhotosLayoutParams>();

    return <>
        <div className='header'>
            <Link to='/'>
                <img alt='Photo Search by flrx39.net'
                    title='Photo Search by flrx39.net'
                    src={faviconUrl}
                    className='logo' />
            </Link>
            <SearchBox query={query} />
            <PhotoFilterControls />
            <LogoutButton />
        </div>

        <div className='photos-container'>
            <Outlet />
        </div>
    </>;
}
