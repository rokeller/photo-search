import { Route, RouterProvider, createBrowserRouter, createRoutesFromElements, useParams, useRouteError } from 'react-router-dom';
import './App.css';
import { SearchPhotoResults, SimilarPhotoResults } from './components';
import { MainLayout, PhotosLayout } from './layouts';
import { Home } from './pages';

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
        return <SearchPhotoResults query={query} />;
    } else {
        return null;
    }
}

function PhotoResultsForRecommend() {
    const { photoId } = useParams();

    if (photoId) {
        return <SimilarPhotoResults photoId={photoId} />;
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

    return <RouterProvider router={router} />;
}
