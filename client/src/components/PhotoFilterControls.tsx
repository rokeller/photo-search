import { useState } from 'react';
import { FilterSettings } from '.';
import { PhotoService } from '../services';
import './PhotoFilterControls.scss';

export function PhotoFilterControls() {
    const [showFilter, setShowFilter] = useState<boolean>();
    const [hasFilter, setHasFilter] = useState(PhotoService.hasFilter());

    function show() {
        setShowFilter(true);
        document.body.classList.add('overflow-open');
    }

    function hide() {
        document.body.classList.remove('overflow-open');
        setShowFilter(false);
        setHasFilter(PhotoService.hasFilter());
    }

    return <div className='filter'>
        <div className={'icon pointer' + (hasFilter ? ' has-filter' : '')}
            onClick={show} title="Filter Settings">⚙️</div>
        {
            showFilter ?
                <div className='filter-options'>
                    <div className='filter-options-container'>
                        <div className='title'>Filter settings</div>
                        <FilterSettings onClose={hide} />
                    </div>
                </div> :
                <></>
        }
    </div >;
}
