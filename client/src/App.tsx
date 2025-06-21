import { AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react';
import {
    RouterProvider, createBrowserRouter,
    useParams
} from 'react-router-dom';
import { Flip, ToastContainer } from 'react-toastify';
import { SearchPhotoResults, SimilarPhotoResults } from './components/PhotoResults';
import MainLayout from './layouts/MainLayout';
import PhotosLayout from './layouts/PhotosLayout';
import ErrorPage from './pages/ErrorPage';
import Home from './pages/Home';
import Login from './pages/Login';

function PhotoResultsForSearch() {
    const { query } = useParams();

    if (query) {
        return <SearchPhotoResults key={'search-' + query} query={query} />;
    } else {
        return null;
    }
}

function PhotoResultsForRecommend() {
    const { photoId } = useParams();

    if (photoId) {
        return <SimilarPhotoResults key={'recommend-' + photoId} photoId={photoId} />;
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
