import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhotoResultItem, PhotoService } from '../services';

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
    const [photoUrl, setPhotoUrl] = useState<string>('/please-wait.svg');

    useEffect(() => {
        async function loadPhoto() {
            const photoUrl = await PhotoService.getPhoto(details.id, 512);
            setPhotoUrl(photoUrl);
        }

        loadPhoto();
    }, [details]);

    return <>
        <img src={photoUrl} title={details.path}
            onClick={() => onView ? onView() : null} />
        <div className='legend'>
            <div className='index'>{resultIndex + 1}</div>
            <div className='metadata'>
                <div className='path'>📂 {details.path}</div>
                {
                    timestamp ?
                        <PhotoTimestamp timestamp={timestamp} dateOnly={isMidnight(timestamp)} /> :
                        <></>
                }
            </div>
            <div className='similar pointer' title='Show similar'
                onClick={() => navigate('/photos/similar/' + encodeURI(details.id))}>💫</div>
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