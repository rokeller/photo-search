import Box from '@mui/material/Box';
import React from 'react';

interface CopyableProps {
    value: string;
}

export function Copyable({ value, children }: React.PropsWithChildren<CopyableProps>) {
    const [clipboardWritable, setClipboardWritable] = React.useState(false);

    globalThis.navigator.permissions.query({ name: 'clipboard-write' as PermissionName })
        .then((result) => setClipboardWritable(result.state === 'granted'))
        .catch(() => setClipboardWritable(false));

    async function copy() {
        await globalThis.navigator.clipboard.writeText(value);
    }

    if (clipboardWritable) {
        return (
            <Box onClick={copy}
                sx={{
                    display: 'inline',
                    cursor: 'pointer',
                }}
            >{children}</Box>
        )
    } else {
        return children;
    }
}
