import { useEffect, useState } from 'react';
import Masonry from 'react-layout-masonry';
import { Photo } from '.';
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
