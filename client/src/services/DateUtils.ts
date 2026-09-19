export const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
    timeStyle: 'medium',
    dateStyle: 'full',
    timeZone: 'UTC',
});

export const dateOnlyFormat = new Intl.DateTimeFormat(undefined, {
    timeStyle: undefined,
    dateStyle: 'full',
    timeZone: 'UTC',
});

export function isMidnight(dt: Date) {
    return dt.getUTCHours() == 0 &&
        dt.getUTCMinutes() == 0 &&
        dt.getUTCSeconds() == 0 &&
        dt.getUTCMilliseconds() == 0;
}
