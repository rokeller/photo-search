import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhotoResultItem, PhotoService } from '../services';
import { PhotoWithRetry } from './PhotoWithRetry';

interface PhotoTileProps {
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

export function PhotoTile({ details, resultIndex, onView }: PhotoTileProps) {
    const navigate = useNavigate();
    const timestamp = details.timestamp ? new Date(details.timestamp * 1000) : undefined;
    // A photoUrl of undefined means that we couldn't load the photo but we can try again.
    const [photoUrl, setPhotoUrl] = useState<string | undefined>('/please-wait.svg');
    const loadPhoto = async () => {
        try {
            const photoUrl = await PhotoService.getPhoto(details.id, 512);
            setPhotoUrl(photoUrl);
        } catch (e) {
            setPhotoUrl(undefined);
        }
    }

    useEffect(() => {
        loadPhoto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [details]);

    return <>
        <div className='photo'>
            <PhotoWithRetry details={details} photoUrl={photoUrl} onClick={onView} onRetry={loadPhoto} />
            <div className='index'>{resultIndex + 1}</div>
            <div className='similar pointer' title='Show similar'
                onClick={() => navigate('/photos/similar/' + encodeURI(details.id))}>💫</div>
        </div>
        <div className='legend'>
            <div className='path' title={details.path}>📂 {details.path}</div>
            {
                timestamp ?
                    <PhotoTimestamp timestamp={timestamp} dateOnly={isMidnight(timestamp)} /> :
                    <></>
            }
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
