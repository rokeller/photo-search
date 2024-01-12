import faviconUrl from '../assets/favicon-96.png';
import { LogoutButton, PhotoFilterControls, SearchBox } from '../components';
import './Home.css';

export function Home() {
    return <div className='welcome perfect-center'>
        <div className='title'>
            <img alt='Photo Search by flrx39.net' title='Photo Search by flrx39.net'
                src={faviconUrl}
                className='logo' />
            Photo Search
        </div>
        <div>
            <SearchBox />
        </div>
        <div className='controls'>
            <PhotoFilterControls />
            <LogoutButton />
        </div>
    </div >
}
