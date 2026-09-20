import { isErrorResponse } from '../services/Errors';
import { ErrorProps } from './PhotoCommon';

export function SearchError({ error }: ErrorProps) {
    const errorCode = isErrorResponse(error) ? error.code : undefined;
    return (
        <div>
            <strong>Search is not available right now.</strong>
            <div>
                Please try again later, or report this issue to your
                administrator.
            </div>
            <div>Error: <code>{errorCode}</code></div>
        </div>
    );
}
