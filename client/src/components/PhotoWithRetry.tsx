import { PhotoResultItem } from '../services';
import './PhotoWithRetry.css';

interface PhotoWithRetryProps {
    details?: PhotoResultItem;
    photoUrl: string | undefined;
    onClick?: () => void;
    onRetry: () => void;
}

export function PhotoWithRetry({ details, photoUrl, onClick, onRetry }: PhotoWithRetryProps) {
    if (photoUrl === undefined) {
        return <div className='retry-load-photo-tile'>
            <div className='parent-perfect-center'>
                Failed to load. <button onClick={onRetry}>Retry</button>
            </div>
        </div>;
    } else {
        return <img src={photoUrl} title={details?.path}
            onClick={() => onClick ? onClick() : null} />;
    }
}
