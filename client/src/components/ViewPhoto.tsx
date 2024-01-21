import { useEffect, useState } from 'react';
import { PhotoService } from '../services';
import { PhotoWithRetry } from './PhotoWithRetry';

interface ViewPhotoProps {
    photoId: string;
    hidePhoto: () => void;
}

export function ViewPhoto({ photoId, hidePhoto }: ViewPhotoProps) {
    // A photoUrl of undefined means that we couldn't load the photo but we can try again.
    const [photoUrl, setPhotoUrl] = useState<string | undefined>('/please-wait.svg');
    const loadPhoto = async () => {
        try {
            const url = await PhotoService.getPhoto(photoId);
            setPhotoUrl(url);
        } catch (e) {
            setPhotoUrl(undefined);
        }
    };

    useEffect(() => {
        loadPhoto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [photoId]);

    return <div className='view'>
        <PhotoWithRetry photoUrl={photoUrl} onRetry={loadPhoto} />
        <div className='close-btn' onClick={hidePhoto}>✖️</div>
    </div>
}
