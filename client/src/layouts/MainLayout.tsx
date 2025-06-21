import { useMsal } from '@azure/msal-react';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MoreIcon from '@mui/icons-material/MoreVert';
import AppBar from '@mui/material/AppBar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import React from 'react';
import { Outlet, Link as RouteLink } from 'react-router-dom';
import FilterDialog from '../components/FilterDialog';
import SearchBox from '../components/SearchBox';
import { PhotoService } from '../services';

const version = import.meta.env.VITE_APP_VERSION || 'under-development';
const mobileMenuId = 'appbar-menu-mobile';

function FilterIconButton({ onClick, }: { onClick?: () => void, }) {
    const [filtersCount, setFiltersCount] = React.useState<number>(PhotoService.filtersCount());

    function onFiltersChanged() {
        setFiltersCount(PhotoService.filtersCount());
    }

    React.useEffect(() => {
        PhotoService.subscribe('photoFilterChanged', onFiltersChanged);
        return () => {
            PhotoService.unsubscribe('photoFilterChanged', onFiltersChanged);
        };
    });

    return (
        <IconButton size='large' onClick={onClick}>
            <Badge color='error' badgeContent={filtersCount}>
                <FilterAltOutlinedIcon />
            </Badge>
        </IconButton>
    );
}

function LogoutIconButton() {
    const { instance } = useMsal();

    async function handleLogout() {
        try {
            await instance.logoutPopup();
        } catch (e) {
            console.error('logout failed', e);
        }
    }

    return (
        <IconButton aria-label='logout' title='Logout' size='large'
            onClick={handleLogout}>
            <LogoutOutlinedIcon />
        </IconButton>
    );
}

export default function MainLayout({ children }: React.PropsWithChildren) {
    const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = React.useState<null | HTMLElement>(null);
    const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);
    const [filtersShown, setFiltersShown] = React.useState<boolean>(false);

    function handleMobileMenuClose() {
        setMobileMoreAnchorEl(null);
    }

    function handleMobileMenuOpen(event: React.MouseEvent<HTMLElement>) {
        setMobileMoreAnchorEl(event.currentTarget);
    };

    function showFilters() {
        setFiltersShown(true);
    }

    function hideFilters() {
        setFiltersShown(false);
    }

    const mobileMenu = (
        <Menu id={mobileMenuId} keepMounted open={isMobileMenuOpen}
            onClose={handleMobileMenuClose} anchorEl={mobileMoreAnchorEl}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}>
            <MenuItem onClick={showFilters}>
                <FilterIconButton />
                <p>Filters</p>
            </MenuItem>
            <MenuItem>
                <LogoutIconButton />
                <p>Log out</p>
            </MenuItem>
        </Menu>
    );

    return <>
        <AppBar position='fixed'>
            <Toolbar>
                <Typography variant='h6' noWrap component='div' sx={{
                    display: { xs: 'none', sm: 'block' },
                }}>
                    <Link underline='none' component={RouteLink} to='/'>
                        Photo Search
                    </Link>
                </Typography>

                <SearchBox />

                {/* show icon buttons for md and above */}
                <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                    <FilterIconButton onClick={showFilters} />
                    <LogoutIconButton />
                </Box>
                {/* show 'more' small and below */}
                <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
                    <IconButton size='large' aria-label='show more' title='Show more'
                        aria-controls={mobileMenuId} aria-haspopup='true'
                        onClick={handleMobileMenuOpen} color='inherit'>
                        <MoreIcon />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
        {mobileMenu}
        <FilterDialog open={filtersShown} onClose={hideFilters} />
        {children ?? <Outlet />}
        <AppBar position='fixed' sx={{ top: 'auto', bottom: 0, }}>
            <Toolbar variant='dense'>
                <Typography variant='body2'>
                    &copy; 2023 - {new Date().getFullYear()}{' '}
                    <Link href='https://flrx39.net' target='_blank' rel='noopener'>
                        flrx39.net
                    </Link>
                    {' '}| {version}
                </Typography>
            </Toolbar>
        </AppBar>
    </>;
}
