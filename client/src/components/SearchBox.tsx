import SearchIcon from '@mui/icons-material/Search';
import InputBase from '@mui/material/InputBase';
import { alpha, styled } from '@mui/material/styles';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface PhotosSearchParams {
    query?: string;
}

const Container = styled('div')(({ theme }) => ({
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    '&:hover': {
        backgroundColor: alpha(theme.palette.common.white, 0.25),
    },
    marginLeft: 0,
    marginRight: theme.spacing(1),
    width: '100%',
    [theme.breakpoints.up('sm')]: {
        marginLeft: theme.spacing(1),
        width: 'auto',
    },
}));

const IconWrapper = styled('div')(({ theme }) => ({
    padding: theme.spacing(0, 2),
    height: '100%',
    position: 'absolute',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
    color: 'inherit',
    width: '100%',
    '& .MuiInputBase-input': {
        padding: theme.spacing(1, 1, 1, 0),
        // vertical padding + font size from searchIcon
        paddingLeft: `calc(1em + ${theme.spacing(4)})`,
        transition: theme.transitions.create('width'),
        width: '100%',
        [theme.breakpoints.up('md')]: {
            width: '100%',
        },
    },
}));

interface SearchState {
    query?: string;
}

interface SearchActionSetQuery {
    type: 'setQuery';
    query?: string;
}

interface SearchActionNavigate {
    type: 'navigate';
}

type SearchAction = SearchActionSetQuery | SearchActionNavigate;

export default function SearchBox() {
    const searchId = React.useId();
    const [searchState, dispatch] = React.useReducer(reducer, {});
    const { query } = useParams<keyof PhotosSearchParams>();
    const navigate = useNavigate();

    function reducer(prev: SearchState, action: SearchAction) {
        switch (action.type) {
            case 'setQuery':
                return { ...prev, query: action.query, };

            case 'navigate':
                setTimeout(() => navigateForQuery(prev.query), 0);
                return prev;

            default:
                return prev;
        }
    }

    function getSearchInput() {
        return document.getElementById(searchId) as HTMLInputElement | undefined;
    }

    function navigateForQuery(query?: string) {
        if (query !== undefined && query !== '') {
            navigate('/photos/search/' + encodeURIComponent(query));
        } else {
            navigate('/');
        }
    }

    function setQuery() {
        const search = getSearchInput();
        if (search) {
            const query = search.value;
            console.debug('setQuery', 'searchState=', searchState, 'newQuery=', query);
            dispatch({ type: 'setQuery', query, });
            dispatch({ type: 'navigate', });
        }
    }

    function onKeyDown(ev: React.KeyboardEvent<HTMLInputElement>) {
        if (ev.key === 'Enter') {
            ev.preventDefault();
            setQuery();
        }
    }

    React.useEffect(() => {
        const search = getSearchInput();
        if (search) {
            search.value = query ?? '';
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query,]);

    React.useEffect(() => {
        const search = getSearchInput();
        if (search) {
            search.addEventListener('search', setQuery);
            return () => {
                search.removeEventListener('search', setQuery);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchId,]);

    return (
        <Container sx={{ flexGrow: 1, }}>
            <IconWrapper>
                <SearchIcon />
            </IconWrapper>
            <StyledInputBase id={searchId} placeholder='Search…' autoFocus
                type='search' onKeyDownCapture={onKeyDown}
                inputProps={{ 'aria-label': 'search' }} />
        </Container>
    );
}
