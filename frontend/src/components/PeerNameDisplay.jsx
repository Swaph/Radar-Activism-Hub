import React from 'react';
import Typography from '@mui/material/Typography';

export function PeerNameDisplay({ children, paragraph, sx }) {
    return (
        <Typography component={paragraph ? 'p' : 'span'} sx={sx}>
            {children}
        </Typography>
    );
}
