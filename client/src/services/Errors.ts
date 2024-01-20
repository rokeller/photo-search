export interface ErrorResponse {
    // The error code string.
    error: ErrorCodes;
}

export function isErrorResponse(obj: unknown): obj is ErrorResponse {
    const errResp = obj as ErrorResponse;
    return (errResp)?.error !== undefined && typeof errResp.error === "string";
}

export enum ErrorCodes {
    EmbeddingServerUnavailable = 'embedding_server_unavailable',
}

export class EmbeddingServerUnavailable extends Error implements ErrorResponse {
    name = 'EmbeddingServerUnavailable';
    error = ErrorCodes.EmbeddingServerUnavailable;
}
