import { Link } from 'react-router-dom';
import faviconUrl from '../assets/favicon-96.png';
import { SearchBox } from '../components';
import './Home.css';

export default function Home() {
    return <div className='welcome'>
        <div>
            TODO: make sure user is logged in.
        </div>
        <div className='title'>
            <img alt='Photo Search by flrx39.net' title='Photo Search by flrx39.net'
                src={faviconUrl}
                className='logo' />
            Photo Search
        </div>
        <div>
            <SearchBox />
        </div>
        <div>
            <Link to='/settings'>Settings</Link>
        </div>
    </div >
}
