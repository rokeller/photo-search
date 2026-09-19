import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import Typography from '@mui/material/Typography';
import { dateOnlyFormat, dateTimeFormat } from '../services/DateUtils';
import { IconStyleProps } from './PhotoConsts';

interface PhotoTimestampProps {
    timestamp: Date;
    dateOnly: boolean;
}

export function PhotoTimestamp({ timestamp, dateOnly }: PhotoTimestampProps) {
    const text = dateOnly ?
        dateOnlyFormat.format(timestamp) : dateTimeFormat.format(timestamp);

    return (
        <Typography variant='body2' title='Date/time of the photo' noWrap>
            <CalendarMonthOutlinedIcon color='primary' sx={IconStyleProps} />
            {text}
        </Typography>
    );
}
