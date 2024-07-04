import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchBox.scss';

export interface SearchBoxProps {
    query?: string;
    onSearchPhotos?: (query: string) => void;
}

export function SearchBox({ query }: SearchBoxProps) {
    const navigate = useNavigate();
    const [currentQuery, setCurrentQuery] = useState<string>(query ?? '');

    function onChangeQuery(ev: React.ChangeEvent<HTMLInputElement>) {
        ev.preventDefault()

        setCurrentQuery(ev.target.value);
    }

    function onKeyUp(ev: React.KeyboardEvent<HTMLInputElement>) {
        if (ev.key === 'Enter') {
            navigate('/photos/search/' + encodeURIComponent(currentQuery))
        }
    }

    return <>
        <div className='search-box'>
            <input className='input' autoFocus type='search'
                placeholder='what are you looking for?'
                value={currentQuery}
                onChange={onChangeQuery}
                onKeyUp={onKeyUp} />
        </div>
    </>
}
