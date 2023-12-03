import React from 'react';
import { Route, RouterProvider, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';
import { Layout } from './Layout';
import { PhotoContainer } from './components';
import { PhotoResultItem, PhotoResultsResponse, PhotoService } from './services';

interface AppState {
    mode?: 'query' | 'recommend';
    query?: string;
    photoId?: string;
    photos?: Array<PhotoResultItem>;
}

const limit = 12;

function extractPhotos(results: PhotoResultsResponse): Array<PhotoResultItem> {
    return results.items.map(
        (item) => ({
            id: item.id,
            path: item.path,
        })
    );
}

export default class App extends React.Component<unknown, AppState> {
    state: AppState = {};

    override render(): React.ReactNode {
        const router = createBrowserRouter(
            createRoutesFromElements(
                <Route path='/' element={<Layout onSearchPhotos={this.onSearchPhotos.bind(this)} />}>
                    <Route index element={
                        <PhotoContainer photos={this.state.photos}
                            onRecommend={this.onRecommendPhotos.bind(this)}
                            onLoadMore={this.onLoadMorePhotos.bind(this)} />
                    } />
                </Route>
            )
        );

        return <RouterProvider router={router} />
    }

    private async onSearchPhotos(query: string) {
        window.scrollTo({ top: 0 });
        this.setState({ photos: undefined });
        const results = await PhotoService.search({ query, limit });
        this.setState({
            mode: 'query',
            photos: extractPhotos(results),
            query
        });
    }

    private async onRecommendPhotos(id: string) {
        window.scrollTo({ top: 0 });
        this.setState({ photos: undefined });
        const results = await PhotoService.recommend({ id, limit });
        this.setState({
            mode: 'recommend',
            photos: extractPhotos(results),
            photoId: id,
        })
    }

    private async onLoadMorePhotos() {
        const offset = this.state.photos?.length;
        let results: PhotoResultsResponse;

        switch (this.state.mode) {
            case 'query':
                results = await PhotoService.search({
                    query: this.state.query!,
                    limit,
                    offset,
                })
                break;

            case 'recommend':
                results = await PhotoService.recommend({
                    id: this.state.photoId!,
                    limit,
                    offset,
                })
                break;

            default:
                throw new Error('unsupported mode: ' + this.state.mode);
        }

        const newPhotoIds = extractPhotos(results);
        const photoIds = [...this.state.photos!, ...newPhotoIds];
        this.setState({ photos: photoIds });
    }
}
