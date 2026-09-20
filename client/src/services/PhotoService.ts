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

class PhotoServiceImpl {
    private uiFilter?: PhotoFilter = {};
    private filterSearch?: ApiFilter = {};
    private filterRecommend?: ApiFilter = {};

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
        if (filter !== undefined) {
            this.filterSearch = {
                notBefore: extractTimestampValue(filter?.notBefore),
                notAfter: extractTimestampValue(filter?.notAfter),
                onThisDay: extractTimestampValue(makeThisYear(filter.onThisDay)),
                minScore: filter.minScoreSearch,
            };
            this.filterRecommend = {
                notBefore: extractTimestampValue(filter?.notBefore),
                notAfter: extractTimestampValue(filter?.notAfter),
                onThisDay: extractTimestampValue(makeThisYear(filter.onThisDay)),
                minScore: filter.minScoreSimilar,
            };
        } else {
            this.filterSearch = this.filterRecommend = undefined;
        }

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
}

export const PhotoService = new PhotoServiceImpl();
