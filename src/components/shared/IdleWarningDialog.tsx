import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'

interface IdleWarningDialogProps {
  open: boolean
  onReEnable: () => void
  onClose: () => void
}

export default function IdleWarningDialog({ open, onReEnable, onClose }: IdleWarningDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Auto-refresh paused</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Auto-refresh has been disabled due to inactivity. Would you like to re-enable it?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button onClick={onReEnable} variant="contained" autoFocus>
          Re-enable
        </Button>
      </DialogActions>
    </Dialog>
  )
}