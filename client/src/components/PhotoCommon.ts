import { SxProps } from '@mui/material/styles';
import { Http, PhotoResultsResponse } from '../services/Http';

export const PhotoOverlayOffsetSpace = 1;
export const IconStyleProps: SxProps = {
    verticalAlign: 'bottom',
};

export const LIMIT = 12;

export interface ErrorProps {
    error: unknown;
}

export type RetrieveFn<T> = (http: Http, props: T, offset: number) => Promise<PhotoResultsResponse>;
