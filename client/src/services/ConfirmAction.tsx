import React from 'react';
import { ConfirmActionDialog, ConfirmActionDialogProps } from '../components/ConfirmActionDialog';

export type ConfirmActionOptions = Pick<ConfirmActionDialogProps,
    'title' | 'message' | 'labelYes' | 'labelNo' | 'colorYes' | 'colorNo'>;

export function useConfirmAction({ ...options }: ConfirmActionOptions) {
    const [open, setOpen] = React.useState(false);
    const resolveRef = React.useRef<(value: boolean) => void>(() => { });

    function onDecidedYes() {
        setOpen(false);
        resolveRef.current(true);
    }

    function onDecidedNo() {
        setOpen(false);
        resolveRef.current(false);
    }

    return {
        Dialog: function () {
            if (open) {
                return (<ConfirmActionDialog open={true} {...options}
                    onYes={onDecidedYes} onNo={onDecidedNo} />);
            } else {
                return null;
            }
        },
        confirm: function () {
            return new Promise((resolve) => {
                resolveRef.current = resolve;
                setOpen(true);
            });
        },
    };
}
