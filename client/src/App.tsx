import { Route, RouterProvider, createBrowserRouter, createRoutesFromElements, useRouteError } from 'react-router-dom';
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

export default function App() {
    const router = createBrowserRouter(
        createRoutesFromElements(
            <Route path='/'
                element={<MainLayout />}
                errorElement={<RouteError />}>
                <Route index element={<Home />} />
                <Route path='/photos/*' element={<PhotosLayout />}>
                    <Route path='search/:query' element={<SearchPhotoResults />} />
                    <Route path='similar/:photoId' element={<SimilarPhotoResults />} />
                </Route>
                <Route path='/settings' element={<div>settings</div>} />
            </Route>
        )
    );

    return <RouterProvider router={router} />;
}
