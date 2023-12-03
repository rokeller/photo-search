import React from 'react';
import { Outlet } from 'react-router-dom';
import './Layout.css';
import faviconUrl from './assets/favicon-96.png';
import { SearchBox, SearchBoxProps } from './components';

const version = import.meta.env.VITE_APP_VERSION || 'under-development';

export class Layout extends React.Component<SearchBoxProps> {
    override render(): React.ReactNode {
        return <>
            <div className='header'>
                <img alt='Photo Search by flrx39.net' title='Photo Search by flrx39.net'
                    src={faviconUrl}
                    className='logo' />
                <SearchBox onSearchPhotos={this.props.onSearchPhotos} />
            </div>

            <div className='content-container'>
                <Outlet />
            </div>

            <div className='footer'>
                &copy; {new Date().getFullYear()} flrx39.net | {version}
            </div>
        </>
    }
}
