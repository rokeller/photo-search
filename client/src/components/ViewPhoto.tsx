import { useEffect, useState } from 'react';
import { PhotoService } from '../services';

interface ViewPhotoProps {
    photoId: string;
    hidePhoto: () => void;
}

export function ViewPhoto({ photoId, hidePhoto }: ViewPhotoProps) {
    const [photoUrl, setPhotoUrl] = useState<string>();

    useEffect(() => {
        const load = async () => {
            const url = await PhotoService.getPhoto(photoId);
            setPhotoUrl(url);
        };

        load();
    }, [photoId]);

    if (photoUrl === undefined) {
        return <>Please wait ...</>;
    }

    return <div className='view'>
        <img src={photoUrl} />
        <div className='close-btn' onClick={hidePhoto}>✖️</div>
    </div>
}
