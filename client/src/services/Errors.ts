export interface ErrorResponse {
    code: ErrorCodes;
    message: string;
}

export function isErrorResponse(obj: unknown): obj is ErrorResponse {
    const errResp = obj as ErrorResponse;
    return (errResp)?.code !== undefined
        && typeof errResp.code === 'string'
        && typeof errResp.message === 'string';
}

export enum ErrorCodes {
    EmbeddingServerUnavailable = 'embedding_server_unavailable',
    VectorDatabaseUnavailable = 'vector_database_unavailable',
}

export class PhotoSearchError extends Error implements ErrorResponse {
    constructor(public readonly code: ErrorCodes, public readonly message: string) {
        super(message);
    }
}
