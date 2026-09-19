import InsertPhotoOutlinedIcon from '@mui/icons-material/InsertPhotoOutlined';
import Typography from '@mui/material/Typography';
import { Copyable } from './Copyable';
import { IconStyleProps } from './PhotoConsts';

interface PhotoPathProps {
    path: string;
}

export function PhotoPath({ path }: PhotoPathProps) {
    return (
        <Typography variant='body2' title={path} noWrap>
            <Copyable value={path}>
                <InsertPhotoOutlinedIcon color='primary' sx={IconStyleProps} />
                {path}
            </Copyable>
        </Typography>
    );
}
