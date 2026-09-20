import Masonry from '@mui/lab/Masonry';
import React from 'react';
import { NoPhotosFound } from './NoPhotosFound';

interface PhotoContainerProps {
    onLoadMore?: () => void;
}

export default function PhotoContainer({ children, onLoadMore }: React.PropsWithChildren<PhotoContainerProps>) {
    React.useEffect(() => {
        function onScroll() {
            const endOfPage = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
            if (endOfPage && onLoadMore) {
                onLoadMore();
            }
        }

        window.addEventListener('scroll', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
        };
    });

    if (!children) {
        return (<NoPhotosFound />);
    }

    return (
        <Masonry columns={{ xs: 1, sm: 2, md: 3, lg: 4, }} spacing={1}>
            {children}
        </Masonry>
    );
}
