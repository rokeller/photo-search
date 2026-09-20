import { AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react';
import Box from '@mui/material/Box';
import React from 'react';
import {
    RouterProvider, createBrowserRouter,
    useParams
} from 'react-router';
import { Flip, ToastContainer } from 'react-toastify';
import { SearchPhotoResults, SimilarPhotoResults } from './components/PhotoResults';
import MainLayout from './layouts/MainLayout';
import PhotosLayout from './layouts/PhotosLayout';
import ErrorPage from './pages/ErrorPage';
import Home from './pages/Home';
import Login from './pages/Login';
import { PhotoFilter, PhotoService } from './services/PhotoService';

function makeFilterKey(filter?: PhotoFilter): string {
    if (!filter) {
        return 'filter-undefined'
    } else {
        return `filter-otd:${filter.onThisDay}-nb:${filter.notBefore}-na:${filter.notAfter}-ms:${filter.minScoreSearch}:${filter.minScoreSimilar}`
    }
}

function PhotoResultsForFilter({ children }: React.PropsWithChildren) {
    const [filterKey, setFilterKey] = React.useState<string>(makeFilterKey(PhotoService.getFilter()));

    function onFiltersChanged() {
        setFilterKey(makeFilterKey(PhotoService.getFilter()));
    }

    React.useEffect(() => {
        PhotoService.subscribe('photoFilterChanged', onFiltersChanged);
        return () => {
            PhotoService.unsubscribe('photoFilterChanged', onFiltersChanged);
        };
    });

    return (<Box key={filterKey}>{children}</Box>);
}

function PhotoResultsForSearch() {
    const { query } = useParams();

    if (query) {
        return (
            <PhotoResultsForFilter>
                <SearchPhotoResults key={`search-${query}`} query={query} />
            </PhotoResultsForFilter>
        );
    } else {
        return null;
    }
}

function PhotoResultsForRecommend() {
    const { photoId } = useParams();

    if (photoId) {
        return (
            <PhotoResultsForFilter>
                <SimilarPhotoResults key={`recommend-$(photoId}`} photoId={photoId} />
            </PhotoResultsForFilter>
        );
    } else {
        return null;
    }
}

export default function App() {
    const router = createBrowserRouter([
        {
            Component: MainLayout,
            errorElement: <MainLayout><ErrorPage /></MainLayout>,
            children: [
                {
                    index: true,
                    Component: Home,
                },
                {
                    path: 'photos/*',
                    Component: PhotosLayout,
                    children: [
                        {
                            path: 'search/:query',
                            Component: PhotoResultsForSearch,
                        },
                        {
                            path: 'similar/:photoId',
                            Component: PhotoResultsForRecommend,
                        },
                    ],
                },
            ],
        },
    ]);

    return (
        <>
            <UnauthenticatedTemplate>
                <Login />
            </UnauthenticatedTemplate>
            <AuthenticatedTemplate>
                <RouterProvider router={router} />
                <ToastContainer position='top-right' theme='dark' transition={Flip} />
            </AuthenticatedTemplate>
        </>
    );
}
