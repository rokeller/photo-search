import AddIcon from '@mui/icons-material/Add';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import InsertPhotoOutlinedIcon from '@mui/icons-material/InsertPhotoOutlined';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { SxProps } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PhotoFilter, PhotoResultItem, PhotoService } from '../services';
import PhotoWithRetry from './PhotoWithRetry';

interface PhotoTileProps {
    resultIndex: number;
    details: PhotoResultItem;
    onView?: () => void;
}

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
    timeStyle: 'medium',
    dateStyle: 'full',
    timeZone: 'UTC',
});
const dateOnlyFormat = new Intl.DateTimeFormat(undefined, {
    timeStyle: undefined,
    dateStyle: 'full',
    timeZone: 'UTC',
});

const PhotoOverlayOffsetSpace = 1;

function PhotoIndex({ index }: { index: number }) {
    return (
        <Typography variant='h6' sx={(theme) => ({
            position: 'absolute',
            top: theme.spacing(PhotoOverlayOffsetSpace),
            left: theme.spacing(PhotoOverlayOffsetSpace),
        })}>{index + 1}</Typography>
    );
}

function Actions({ photoId, timestamp }: { photoId: string, timestamp?: Date, }) {
    const buttonId = React.useId();
    const menuId = React.useId();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const menuOpen = Boolean(anchorEl);
    const navigate = useNavigate();

    function onOpenMenu(event: React.MouseEvent<HTMLButtonElement>) {
        setAnchorEl(event.currentTarget);
    }

    function onCloseMenu() {
        setAnchorEl(null);
    }

    function showSimilar() {
        navigate('/photos/similar/' + encodeURI(photoId));
        onCloseMenu();
    }

    function setOnThisDayFilter() {
        const filter: PhotoFilter = PhotoService.getFilter() || {};
        PhotoService.setFilter({ ...filter, onThisDay: timestamp, })
        onCloseMenu();
    }

    return (
        <>
            <Fab id={buttonId} size='small' color='secondary' variant='circular'
                title='More…' onClick={onOpenMenu}
                aria-label='more' aria-controls={menuOpen ? menuId : undefined}
                aria-haspopup='true'
                aria-expanded={menuOpen ? 'true' : undefined}
                sx={(theme) => ({
                    position: 'absolute',
                    top: theme.spacing(PhotoOverlayOffsetSpace),
                    right: theme.spacing(PhotoOverlayOffsetSpace),
                })}>
                <AddIcon />
            </Fab>
            {menuOpen ?
                <Menu id={menuId} anchorEl={anchorEl} open={menuOpen}
                    onClose={onCloseMenu} anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                    slotProps={{ list: { 'aria-labelledby': buttonId, }, }}>
                    <MenuItem onClick={showSimilar}>
                        <ListItemIcon>
                            <TipsAndUpdatesOutlinedIcon />
                        </ListItemIcon>
                        <ListItemText>
                            Show similar
                        </ListItemText>
                    </MenuItem>
                    {timestamp ?
                        <MenuItem onClick={setOnThisDayFilter}>
                            <ListItemIcon>
                                <EventOutlinedIcon />
                            </ListItemIcon>
                            <ListItemText>
                                Filter "On this day"
                            </ListItemText>
                        </MenuItem> : null}
                </Menu> : null}
        </>
    );
}

export default function PhotoTile({ details, resultIndex, onView }: PhotoTileProps) {
    const timestamp = details.timestamp ? new Date(details.timestamp * 1000) : undefined;
    // A photoUrl of undefined means that we couldn't load the photo but we can try again.
    const [photoUrl, setPhotoUrl] = React.useState<string | undefined>('/please-wait.svg');
    const loadPhoto = async () => {
        try {
            const photoUrl = await PhotoService.getPhoto(details.id, 512);
            setPhotoUrl(photoUrl);
        } catch (e) {
            console.error('failed to load photo', e);
            setPhotoUrl(undefined);
        }
    }

    React.useEffect(() => {
        loadPhoto();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [details]);

    const timestampLegend = timestamp ?
        <PhotoTimestamp timestamp={timestamp} dateOnly={isMidnight(timestamp)} />
        : null;

    return (
        <Paper>
            <Stack direction='column' justifyContent='center'>
                <Box sx={{ position: 'relative', textAlign: 'center', }}>
                    <PhotoWithRetry details={details} photoUrl={photoUrl}
                        preview onClick={onView} onRetry={loadPhoto} />
                    <PhotoIndex index={resultIndex} />
                    <Actions photoId={details.id} timestamp={timestamp} />
                </Box>
                <Box sx={(theme) => ({ p: theme.spacing(1) })}>
                    <PhotoPath path={details.path!} />
                    {timestampLegend}
                </Box>
            </Stack>
        </Paper >
    );
}

const IconStyleProps: SxProps = {
    verticalAlign: 'bottom',
};

function PhotoPath({ path }: { path: string }) {
    return (
        <Typography variant='body2' title={path} noWrap>
            <InsertPhotoOutlinedIcon color='primary' sx={IconStyleProps} />
            {path}
        </Typography>
    );
}

function PhotoTimestamp({ timestamp, dateOnly }: { timestamp: Date, dateOnly: boolean }) {
    const text = dateOnly ?
        dateOnlyFormat.format(timestamp) : dateTimeFormat.format(timestamp);

    return (
        <Typography variant='body2' title='Date/time of the photo' noWrap>
            <CalendarMonthOutlinedIcon color='primary' sx={IconStyleProps} />
            {text}
        </Typography>
    );
}

function isMidnight(dt: Date) {
    return dt.getUTCHours() == 0 &&
        dt.getUTCMinutes() == 0 &&
        dt.getUTCSeconds() == 0 &&
        dt.getUTCMilliseconds() == 0;
}
