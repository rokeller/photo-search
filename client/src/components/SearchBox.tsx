import React, { useState } from 'react';
import './SearchBox.css';

export interface SearchBoxProps {
    onSearchPhotos?: (query: string) => void;
}

export function SearchBox({ onSearchPhotos: onSubmit }: SearchBoxProps) {
    const [query, setQuery] = useState<string>('');

    function onChangeQuery(ev: React.ChangeEvent<HTMLInputElement>) {
        ev.preventDefault()

        setQuery(ev.target.value);
    }

    function onKeyUp(ev: React.KeyboardEvent<HTMLInputElement>) {
        if (ev.key === 'Enter') {
            if (onSubmit) {
                onSubmit(query);
            }
        }
    }

    return <>
        <div className='search-box'>
            <input className='input' autoFocus type='search'
                placeholder='what are you looking for?'
                value={query}
                onChange={onChangeQuery}
                onKeyUp={onKeyUp} />
        </div>
    </>
}
