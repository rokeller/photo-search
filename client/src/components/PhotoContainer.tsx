import { useEffect, useState } from 'react';
import Masonry from 'react-layout-masonry';
import { PhotoTile, ViewPhoto } from '.';
import { PhotoResultItem } from '../services';
import './PhotoContainer.scss'

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
        const onViewKeyUp = (ev: KeyboardEvent) => {
            if (ev.key === 'Escape') {
                hidePhoto();
            }
        };

        if (photoId !== undefined) {
            window.addEventListener('keyup', onViewKeyUp);
        } else {
            window.removeEventListener('keyup', onViewKeyUp);
        }

        return () => {
            window.removeEventListener('keyup', onViewKeyUp);
        }
    }, [photoId])


    function showPhoto(photoId: string) {
        setPhotoId(photoId);
        document.body.classList.add('overflow-open');
    }

    function hidePhoto() {
        document.body.classList.remove('overflow-open');
        setPhotoId(undefined);
    }

    return <div className='photos'>
        <Masonry columns={{ 0: 1, 599: 2, 999: 3, 1199: 4 }} gap={8}>
            {
                photos?.map(
                    (item, index) => <div key={index + '-' + item.id} className='item'>
                        <PhotoTile details={item} resultIndex={index}
                            onView={() => showPhoto(item.id)} />
                    </div>
                )
            }
        </Masonry>
        {
            photoId !== undefined ?
                <ViewPhoto photoId={photoId} hidePhoto={hidePhoto} /> :
                <></>
        }

    </div >
}
