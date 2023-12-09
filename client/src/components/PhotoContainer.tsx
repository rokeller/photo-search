import { useEffect, useState } from 'react';
import Masonry from 'react-layout-masonry';
import { useNavigate } from 'react-router-dom';
import { PhotoResultItem, PhotoService } from '../services';
import './PhotoContainer.css';

interface PhotoContainerProps {
    photos?: Array<PhotoResultItem>;
    onLoadMore?: () => void;
}

export function PhotoContainer({ photos, onLoadMore }: PhotoContainerProps) {
    const [photoId, setPhotoId] = useState<string>();

    useEffect(() => {
        function onScroll() {
            const endOfPage = window.innerHeight + window.scrollY >= document.body.offsetHeight;
            if (endOfPage && onLoadMore) {
                onLoadMore();
            }
        }

        window.addEventListener('scroll', onScroll);

        return () => {
            window.removeEventListener('scroll', onScroll);
        }
    });

    useEffect(() => {
        if (photoId !== undefined) {
            window.addEventListener('keyup', onViewKeyUp);
        } else {
            window.removeEventListener('keyup', onViewKeyUp);
        }

        return () => {
            window.removeEventListener('keyup', onViewKeyUp);
        }
    }, [photoId])

    function onViewKeyUp(ev: KeyboardEvent) {
        if (ev.key === 'Escape') {
            setPhotoId(undefined);
        }
    }

    return <div className='photos'>
        <Masonry columns={{ 0: 1, 599: 2, 999: 3, 1199: 4 }} gap={8}>
            {
                photos?.map(
                    (item, index) => <div key={index + '-' + item.id} className='item'>
                        <Photo details={item} resultIndex={index} onView={() => setPhotoId(item.id)} />
                    </div>
                )
            }
        </Masonry>
        <div className={'view ' + (photoId !== undefined ? 'view-on' : 'view-off')}>
            {
                photoId !== undefined ?
                <img src={PhotoService.getPhotoSrc(photoId)} /> :
                <></>
            }
            <div className='close-btn' onClick={() => setPhotoId(undefined)}>✖️</div>
        </div>
    </div >
}

interface PhotoProps {
    resultIndex: number;
    details: PhotoResultItem;
    onView?: () => void;
}

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
    timeStyle: 'medium',
    dateStyle: 'full',
    timeZone: 'UTC',
});
const dateOnlyFormat = new Intl.DateTimeFormat(undefined, {
    timeStyle: undefined,
    dateStyle: 'full',
    timeZone: 'UTC',
});

function Photo({ details, resultIndex, onView }: PhotoProps) {
    const navigate = useNavigate();
    const timestamp = details.timestamp ? new Date(details.timestamp * 1000) : undefined;

    return <>
        <img src={PhotoService.getPhotoSrc(details.id, 512)} title={details.path}
            onClick={() => navigate('/photos/similar/' + encodeURI(details.id))} />
        <div className='legend'>
            <div className='index'>{resultIndex + 1}</div>
            <div className='metadata'>
                <div className='path'>📂 {details.path}</div>
                {
                    timestamp ?
                        <PhotoTimestamp timestamp={timestamp} dateOnly={isMidnight(timestamp)} /> :
                        <></>
                }
                {
                    // TODO: hide when extended metadata is not turned on.
                    details.cam ?
                        <div>📷 {details.cam}</div> :
                        <></>
                }
            </div>
            <div className='view' onClick={() => onView ? onView() : null}>🔍</div>
        </div>
    </>
}

function PhotoTimestamp({ timestamp, dateOnly }: { timestamp: Date, dateOnly: boolean }) {
    if (dateOnly) {
        return <div className='timestamp'>⏰️ {dateOnlyFormat.format(timestamp)}</div>;
    } else {
        return <div className='timestamp'>⏰️ {dateTimeFormat.format(timestamp)}</div>;
    }
}

function isMidnight(dt: Date) {
    return dt.getUTCHours() == 0 &&
        dt.getUTCMinutes() == 0 &&
        dt.getUTCSeconds() == 0 &&
        dt.getUTCMilliseconds() == 0;
}
