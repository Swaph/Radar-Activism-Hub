import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';

export const Form = styled('form')(({ theme }) => ({
    maxWidth: theme.breakpoints.values.sm,
    margin: 'auto',
    padding: theme.spacing(2),
}));

export function Main({ children, sx }) {
    return (
        <Box component={Paper} sx={{ p: 3, maxWidth: 'md', mx: 'auto', ...sx }}>
            {children}
        </Box>
    );
}
