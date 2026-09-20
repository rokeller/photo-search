const StorageKeyFilter = 'photos.filter';

enum PhotoEventNames {
    PhotoFilterChanged = 'photoFilterChanged',
}

type PhotoFilterChanged = 'photoFilterChanged';
type PhotoEvents = PhotoFilterChanged;

export interface PhotoFilterChangedEvent {
    old?: PhotoFilter;
    new?: PhotoFilter;
}

export interface PhotoFilter {
    notBefore?: Date;
    notAfter?: Date;
    onThisDay?: Date;

    minScoreSearch?: number;
    minScoreSimilar?: number;
}

interface ApiFilter {
    notBefore?: number;
    notAfter?: number;
    onThisDay?: number;

    minScore?: number;
}

export interface FilterChangedEvent {
    old?: PhotoFilter;
    new?: PhotoFilter;
}

function extractTimestampValue(dt: Date | undefined): number | undefined {
    if (dt === undefined) {
        return undefined;
    }

    return dt.valueOf() / 1000;
}

function makeThisYear(dt: Date | undefined) {
    if (dt === undefined) {
        return undefined;
    }

    const isoStr = dt.toISOString();
    const monthAndDay = isoStr.substring(4, 4 /*year*/ + 2 /*month*/ + 2 /*day*/ + 2 /*dashes*/);
    const year = new Date().getFullYear();
    return new Date(year + monthAndDay + 'T00:00:00Z')
}

function ensureDate(dt: Date | string | undefined): Date | undefined {
    if (dt) {
        if (typeof dt === 'string') {
            return new Date(dt);
        }
        return dt;
    }
}

class PhotoServiceImpl {
    private uiFilter?: PhotoFilter = {};
    private filterSearch?: ApiFilter = {};
    private filterRecommend?: ApiFilter = {};

    constructor() {
        this.loadFilter();
    }

    public subscribe(
        eventName: PhotoEvents,
        listener: EventListenerOrEventListenerObject
    ) {
        document.addEventListener(eventName, listener);
    }

    public unsubscribe(
        eventName: PhotoEvents,
        listener: EventListenerOrEventListenerObject
    ) {
        document.removeEventListener(eventName, listener);
    }

    public setFilter(filter?: PhotoFilter) {
        const oldFilter = this.uiFilter;

        this.uiFilter = filter;
        this.peristFilter();
        this.propagateFilter();

        if (!Object.is(oldFilter, filter)) {
            const ev: CustomEvent<FilterChangedEvent> = new CustomEvent(
                PhotoEventNames.PhotoFilterChanged,
                {
                    detail: {
                        old: oldFilter,
                        new: filter,
                    },
                });
            document.dispatchEvent(ev);
        }
    }

    public getFilter() {
        return this.uiFilter;
    }

    public getSearchFilter() {
        return this.filterSearch;
    }

    public getRecommendFilter() {
        return this.filterRecommend;
    }

    public filtersCount() {
        if (this.uiFilter !== undefined) {
            return [
                this.uiFilter.minScoreSearch !== undefined,
                this.uiFilter.minScoreSimilar !== undefined,
                this.uiFilter.notBefore !== undefined,
                this.uiFilter.notAfter !== undefined,
                this.uiFilter.onThisDay !== undefined,
            ].filter((isSet) => isSet).length;
        }
        return 0;
    }

    private peristFilter() {
        if (this.uiFilter) {
            localStorage.setItem(StorageKeyFilter, JSON.stringify(this.uiFilter))
        } else {
            localStorage.removeItem(StorageKeyFilter)
        }
    }

    private propagateFilter() {
        if (this.uiFilter) {
            this.filterSearch = {
                notBefore: extractTimestampValue(this.uiFilter.notBefore),
                notAfter: extractTimestampValue(this.uiFilter.notAfter),
                onThisDay: extractTimestampValue(makeThisYear(this.uiFilter.onThisDay)),
                minScore: this.uiFilter.minScoreSearch,
            };
            this.filterRecommend = {
                notBefore: extractTimestampValue(this.uiFilter.notBefore),
                notAfter: extractTimestampValue(this.uiFilter.notAfter),
                onThisDay: extractTimestampValue(makeThisYear(this.uiFilter.onThisDay)),
                minScore: this.uiFilter.minScoreSimilar,
            };
        } else {
            this.filterSearch = this.filterRecommend = undefined;
        }
    }

    private loadFilter() {
        const val = localStorage.getItem(StorageKeyFilter)
        if (val !== null) {
            this.uiFilter = JSON.parse(val);
            if (this.uiFilter) {
                this.uiFilter.notAfter = ensureDate(this.uiFilter.notAfter);
                this.uiFilter.notBefore = ensureDate(this.uiFilter.notBefore);
                this.uiFilter.onThisDay = ensureDate(this.uiFilter.onThisDay);
            }
        } else {
            this.uiFilter = undefined;
        }
        this.propagateFilter();
    }
}

export const PhotoService = new PhotoServiceImpl();
