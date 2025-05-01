import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

export function DownloadResourcesDialog({ showDownloadDialog, handleDownloadDialogClose }) {
    return (
        <Dialog open={showDownloadDialog} onClose={handleDownloadDialogClose}>
            <DialogTitle>Download Latest Resources</DialogTitle>
            <DialogContent>
                <Typography>
                    Click the button below to download the latest activist resources, including protest timetables, bill breakdowns, and safety guidelines.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                        window.open('/resources/manifesto.pdf', '_blank');
                    }}
                >
                Download Now
                </Button>
                <Button onClick={handleDownloadDialogClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
