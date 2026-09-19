import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
import Divider from '@mui/material/Divider';
import Fab from '@mui/material/Fab';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import React from 'react';
import { useNavigate } from 'react-router';
import { useConfirmAction } from '../services/ConfirmAction';
import { useHttpService } from '../services/Http';
import { PhotoFilter, PhotoService } from '../services/PhotoService';
import { PhotoOverlayOffsetSpace } from './PhotoConsts';

interface PhotoActionsProps {
    photoId: string;
    timestamp?: Date;
}

export function PhotoActions({ photoId, timestamp }: PhotoActionsProps) {
    const buttonId = React.useId();
    const menuId = React.useId();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const menuOpen = Boolean(anchorEl);
    const navigate = useNavigate();
    const httpPromise = useHttpService();
    const {
        confirm: confirmRemoveFromIndex,
        Dialog: ConfirmRemoveFromIndexDialog,
    } = useConfirmAction({
        title: 'Remove photo from index?',
        message: 'Are you sure you want to remove this photo from the search index? ' +
            'Please note that this will not delete the photo itself.',
    })

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

    async function removeFromIndex() {
        onCloseMenu();
        if (await confirmRemoveFromIndex()) {
            const http = await httpPromise;
            await http.removeFromIndex(photoId);
        }
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
                    <Divider />
                    <MenuItem onClick={removeFromIndex}>
                        <ListItemIcon>
                            <DeleteIcon />
                        </ListItemIcon>
                        <ListItemText>
                            Remove from index
                        </ListItemText>
                    </MenuItem>
                </Menu>
                : null}
            <ConfirmRemoveFromIndexDialog />
        </>
    );
}
