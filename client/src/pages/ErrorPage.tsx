import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { Link as RouteLink, useRouteError } from 'react-router-dom';
import PerfectCentered from '../components/PerfectCentered';

export default function ErrorPage() {
    const error = useRouteError();

    // For query parameters documentation, see
    // https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue#creating-an-issue-from-a-url-query
    const issueQuery = new URLSearchParams([
        ['title', 'Issue with routing'],
        ['body', 'Error object from route:\n\n```json\n' + JSON.stringify(error, null, 4) + '\n```'],
        ['labels', 'bug,javascript'],
    ]);
    const reportIssueUrl = 'https://github.com/rokeller/photo-search/issues/new?' +
        issueQuery;

    return (
        <PerfectCentered>
            <Card variant='outlined' sx={(theme) => ({ padding: theme.spacing(6), })}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography component='h1' variant='h6'>
                        Oops!
                    </Typography>

                    <Typography variant='body1'>
                        Sorry, an unexpected error has occurred. Please feel
                        free to{' '}
                        <Link href={reportIssueUrl} target='_blank' rel='noopener'>
                            report an issue on GitHub.
                        </Link>
                    </Typography>

                    <Typography variant='body1'>
                        Go back to the{' '}
                        <Link component={RouteLink} to='/'>
                            home page
                        </Link>
                        .
                    </Typography>
                </Box>
            </Card>
        </PerfectCentered>
    );
}
