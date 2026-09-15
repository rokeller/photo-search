interface AuthConfig {
    clientId: string;
    authority: string;
    scopes: string[];
}

interface PhotoSearch {
    auth: AuthConfig;
}

export declare global {
    var photoSearch: PhotoSearch;
}
