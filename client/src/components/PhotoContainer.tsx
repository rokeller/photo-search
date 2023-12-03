import { HTMLProps, useEffect } from 'react';
import Masonry from 'react-layout-masonry';
import { PhotoResultItem, PhotoService } from '../services';
import './PhotoContainer.css';

interface PhotoContainerProps {
    photos?: Array<PhotoResultItem>;
    onLoadMore?: () => void;
    onRecommend?: (id: string) => void;
}

function noop() { }

export function PhotoContainer({ photos, onLoadMore, onRecommend }: PhotoContainerProps) {
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

    return <div className='photos'>
        <Masonry columns={{ 0: 1, 599: 2, 999: 3, 1199: 4 }} gap={8}>
            {
                photos?.map(
                    (item, index) => <div key={index + '-' + item.id} className='item'>
                        <Photo id={item.id} title={'#' + (index + 1) + ' - ' + item.path}
                            onClick={() => onRecommend ? onRecommend(item.id) : noop()} />
                    </div>
                )
            }
        </Masonry>
    </div>
}

interface PhotoProps {
    id: string;
}

function Photo({ id, onClick, title }: PhotoProps & HTMLProps<HTMLImageElement>) {
    return <>
        <img src={PhotoService.getPhotoSrc(id)} title={title} onClick={onClick} />
        <div className='legend'>{title}</div>
    </>
}
