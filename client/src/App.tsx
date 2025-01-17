import { AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react';
import { Route, RouterProvider, createBrowserRouter, createRoutesFromElements, useParams, useRouteError } from 'react-router-dom';
import { Flip, ToastContainer } from 'react-toastify';
import './App.scss';
import { SearchPhotoResults, SimilarPhotoResults } from './components';
import { MainLayout, PhotosLayout } from './layouts';
import { Home, Login } from './pages';

function RouteError() {
    const error = useRouteError();

    return <div id="error-page">
        <h1>Oops!</h1>
        <p>Sorry, an unexpected error has occurred.</p>
        <p>
            <pre>{JSON.stringify(error)}</pre>
        </p>
    </div>
}

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
    const router = createBrowserRouter(
        createRoutesFromElements(
            <Route path='/'
                element={<MainLayout />}
                errorElement={<RouteError />}>
                <Route index element={<Home />} />
                <Route path='/photos/*' element={<PhotosLayout />}>
                    <Route path='search/:query'
                        element={<PhotoResultsForSearch />} />
                    <Route path='similar/:photoId'
                        element={<PhotoResultsForRecommend />} />
                </Route>
                <Route path='/settings' element={<div>settings</div>} />
            </Route>
        )
    );

    return <>
        <UnauthenticatedTemplate>
            <Login />
        </UnauthenticatedTemplate>
        <AuthenticatedTemplate>
            <RouterProvider router={router} />
            <ToastContainer position='top-right' theme='dark' transition={Flip} />
        </AuthenticatedTemplate>
    </>;
}
