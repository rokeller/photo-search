import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

type ButtonColor = 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';

export interface ConfirmActionDialogProps {
    open: boolean;
    title: string;
    message: string;
    labelYes?: string;
    labelNo?: string;
    colorYes?: ButtonColor;
    colorNo?: ButtonColor;
    onYes: () => void;
    onNo: () => void;
}

export function ConfirmActionDialog({
    open,
    title, message,
    labelYes = 'OK', labelNo = 'Cancel',
    colorYes = 'error', colorNo = 'inherit',
    onYes, onNo,
}: ConfirmActionDialogProps) {
    return (
        <Dialog open={open} onClose={onNo}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>{message}</DialogContent>
            <DialogActions>
                <Button onClick={onNo} color={colorNo} variant='contained'>
                    {labelNo}
                </Button>
                <Button onClick={onYes} color={colorYes} variant='contained'>
                    {labelYes}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
