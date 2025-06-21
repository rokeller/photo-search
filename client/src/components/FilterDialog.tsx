import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import React, { SetStateAction } from 'react';
import { PhotoService } from '../services';

interface FilterSettingsProps {
    open: boolean;
    onClose?: () => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div role='tabpanel' hidden={value !== index}
            id={'vertical-tabpanel-' + index}
            aria-labelledby={'vertical-tab-' + index}
            {...other}>
            {value === index && (
                <Box sx={{ p: 3 }}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </div>
    );
}

function makeInputControlTimestamp(dt: Date | undefined) {
    if (dt == undefined) {
        return '';
    }

    try {
        const isoStr = dt.toISOString();
        return isoStr.substring(0, isoStr.length - 1);
    } catch {
        return '';
    }
}

function makeInputControlDate(dt: Date | undefined) {
    if (dt == undefined) {
        return '';
    }

    try {
        const isoStr = dt.toISOString();
        return isoStr.substring(0, 4 /*year*/ + 2 /*month*/ + 2 /*day*/ + 2 /*dashes*/);
    } catch {
        return '';
    }
}

interface TimestampSelectorProps {
    label: string;
    timestamp?: Date;
    setter: React.Dispatch<React.SetStateAction<Date | undefined>>
}

function TimestampSelector(props: TimestampSelectorProps) {
    const { label, timestamp, setter, } = props;

    function onChangeTimestamp(
        setter: React.Dispatch<React.SetStateAction<Date | undefined>>
    ) {
        return (ev: React.ChangeEvent<HTMLInputElement>) => {
            const local = ev.target.value;
            setter(new Date(local + 'Z'));
        }
    }

    return (
        <Stack direction='row'>
            <FormControlLabel label={label} labelPlacement='top'
                control={<input type='datetime-local' value={makeInputControlTimestamp(timestamp)}
                    onChange={onChangeTimestamp(setter)} />} />
            <Button color='secondary' onClick={() => setter(undefined)}>{`Remove "${label}" filter`}</Button>
        </Stack>
    );
}


interface DateSelectorProps {
    label: string;
    date?: Date;
    setter: React.Dispatch<React.SetStateAction<Date | undefined>>
}

function DateSelector(props: DateSelectorProps) {
    const { label, date, setter, } = props;

    function onChangeDate(
        setValue: React.Dispatch<React.SetStateAction<Date | undefined>>
    ) {
        return (ev: React.ChangeEvent<HTMLInputElement>) => {
            const local = ev.target.value;
            setValue(new Date(local + 'T00:00:00Z'));
        }
    }

    return (
        <Stack direction='row'>
            <FormControlLabel label={label} labelPlacement='top'
                control={<input type='date' value={makeInputControlDate(date)}
                    onChange={onChangeDate(setter)} />} />
            <Button color='secondary' onClick={() => setter(undefined)}>{`Remove "${label}" filter`}</Button>
        </Stack>
    );
}

function allyProps(index: number) {
    return {
        id: 'vertical-tab-' + index,
        'aria-controls': 'vertical-tabpanel-' + index,
    };
}

function normalizeScore(score: number | undefined) {
    if (score === undefined || score <= 0) {
        return undefined;
    }
    else if (score > 1) {
        return 1;
    }
    else {
        return score;
    }
}

export default function FilterDialog({ open, onClose }: FilterSettingsProps) {
    const [tab, setTab] = React.useState(0);
    const [minScoreSearch, setMinScoreSearch] = React.useState<number>();
    const [minScoreSimilar, setMinScoreSimilar] = React.useState<number>();
    const [notBefore, setNotBefore] = React.useState<Date>();
    const [notAfter, setNotAfter] = React.useState<Date>();
    const [onThisDay, setOnThisDay] = React.useState<Date>();

    React.useEffect(() => {
        PhotoService.subscribe('photoFilterChanged', onFiltersChanged);
        return () => PhotoService.unsubscribe('photoFilterChanged', onFiltersChanged);
    });

    function onChangeTab(_: React.SyntheticEvent, newTab: number) {
        setTab(newTab);
    }

    function onFiltersChanged() {
        const filter = PhotoService.getFilter();
        setMinScoreSearch(filter?.minScoreSearch);
        setMinScoreSimilar(filter?.minScoreSimilar);
        setNotBefore(filter?.notBefore);
        setNotAfter(filter?.notAfter);
        setOnThisDay(filter?.onThisDay);
    }

    function apply() {
        const filter = {
            minScoreSearch: normalizeScore(minScoreSearch),
            minScoreSimilar: normalizeScore(minScoreSimilar),
            notBefore,
            notAfter,
            onThisDay,
        };
        PhotoService.setFilter(filter);
        close();
    }

    function reset() {
        setMinScoreSearch(undefined);
        setMinScoreSimilar(undefined);
        setNotBefore(undefined);
        setNotAfter(undefined);
        setOnThisDay(undefined);
    }

    function close() {
        onFiltersChanged();
        if (onClose) {
            onClose();
        }
    }

    function swapNotBeforeNotAfter() {
        setNotBefore(notAfter);
        setNotAfter(notBefore);
    }

    function getOnChangeMinScoreHandler(setter: (val: SetStateAction<number | undefined>) => void) {
        return (_: React.SyntheticEvent | Event, value: number | number[]) => {
            if (Number.isInteger(value)) {
                setter(Number(value) / 100);
            }
        }
    }

    const minSearchScoreVal = minScoreSearch !== undefined ? Math.round(minScoreSearch * 100) : 0;
    const minSimilarScoreVal = minScoreSimilar !== undefined ? Math.round(minScoreSimilar * 100) : 0;

    return (
        <Dialog open={open} onClose={onClose} aria-labelledby='filter-dialog-title'>
            <DialogTitle id='alert-dialog-title'>
                Filters
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Define filters to apply to photo results.
                </DialogContentText>

                <Tabs value={tab} onChange={onChangeTab}>
                    <Tab label='Similarity' {...allyProps(0)} />
                    <Tab label='Dates/times' {...allyProps(1)} />
                </Tabs>

                <TabPanel value={tab} index={0}>
                    <Box>
                        <Typography variant='body1'>
                            Minimum search score
                        </Typography>
                        <Slider aria-label='minimum search score'
                            onChangeCommitted={getOnChangeMinScoreHandler(setMinScoreSearch)}
                            min={0} max={100} step={5} marks={true} value={minSearchScoreVal}
                            getAriaValueText={(val) => `${val} %`}
                            valueLabelDisplay='auto' />
                        <Typography variant='body2'>
                            Higher values reduce the number of photos found
                            when searching. Lower values will result photos
                            being shown which may not match the search query
                            well at all. Scores higher than 30-40 in search are
                            usually quite rare.
                        </Typography>
                    </Box>
                    <Box mt={2}>
                        <Typography variant='body1'>
                            Minimum similarity score
                        </Typography>
                        <Slider aria-label='minimum similarity score'
                            onChangeCommitted={getOnChangeMinScoreHandler(setMinScoreSimilar)}
                            min={0} max={100} step={5} marks={true} value={minSimilarScoreVal}
                            getAriaValueText={(val) => `${val} %`}
                            valueLabelDisplay='auto' />
                        <Typography variant='body2'>
                            Higher values reduce the number of photos found
                            when showing similar photos. Lower values will
                            result in photos being shown which are not
                            similar to the selected photo at all. Photo
                            similarity scores of 95 and above typically apply
                            to duplicate photos and/or photos that were taken at
                            the same place and/or time.
                        </Typography>
                    </Box>
                </TabPanel>

                <TabPanel value={tab} index={1}>
                    <Box>
                        <TimestampSelector label='Not before' setter={setNotBefore} timestamp={notBefore} />
                        <Typography variant='body2'>
                            Show only photos with a timestamp (local time of where
                            the photo was taken) that is not before this date/time.
                        </Typography>
                    </Box>

                    <Box mt={2}>
                        <TimestampSelector label='Not after' setter={setNotAfter} timestamp={notAfter} />
                        {
                            notBefore !== undefined && notAfter !== undefined &&
                                notBefore > notAfter ?
                                <Alert severity='error'>
                                    "Not before" refers to a date/time that is
                                    later than "Not after". If you keep/apply
                                    these filters, no photos will be shown.
                                </Alert>
                                :
                                null
                        }
                        <Typography variant='body2'>
                            Show only photos with a timestamp (local time of where
                            the photo was taken) that is not after this date/time.
                        </Typography>
                        <Button disabled={notBefore === undefined && notAfter === undefined}
                            color='secondary' onClick={swapNotBeforeNotAfter}>
                            Swap "Not before" and "Not after"
                        </Button>
                    </Box>

                    <Box mt={2}>
                        <DateSelector label='On this day' setter={setOnThisDay} date={onThisDay} />
                        <Typography variant='body2'>
                            Show only photos with a timestamp (local time of where
                            the photo was taken) that is the day (of any year).
                        </Typography>
                    </Box>
                </TabPanel>
            </DialogContent>
            <DialogActions>
                <Button onClick={apply}>Apply</Button>
                <Button onClick={reset}>Reset</Button>
                <Button onClick={close}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
