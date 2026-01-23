import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import SaveIcon from '@mui/icons-material/Save'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Tooltip,
} from '@mui/material'
import { ChangeEvent, useRef, useState } from 'react'

import { exportTRPlan, importTRPlan, TRPlan } from '@/storage/trPlannerDb'

interface PlanManagerProps {
  savedPlans: TRPlan[]
  currentPlanId: number | null
  currentPlanName: string
  onNewPlan: () => void
  onSavePlan: (name?: string) => Promise<void>
  onLoadPlan: (id: number) => Promise<void>
  onDeletePlan: (id: number) => Promise<void>
  onDuplicatePlan: (id: number, newName: string) => Promise<void>
  onSetPlanName: (name: string) => void
  compact?: boolean
}

export default function PlanManager({
  savedPlans,
  currentPlanId,
  currentPlanName,
  onNewPlan,
  onSavePlan,
  onLoadPlan,
  onDeletePlan,
  onDuplicatePlan,
  onSetPlanName,
  compact = false,
}: PlanManagerProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [duplicateId, setDuplicateId] = useState<number | null>(null)
  const [duplicateName, setDuplicateName] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveClick = () => {
    if (currentPlanId !== null) {
      // Update existing plan
      void onSavePlan()
    } else {
      // Show save dialog for new plan
      setNewPlanName(currentPlanName)
      setSaveDialogOpen(true)
    }
  }

  const handleSaveConfirm = async () => {
    await onSavePlan(newPlanName)
    setSaveDialogOpen(false)
  }

  const handleDuplicateClick = (id: number, name: string) => {
    setDuplicateId(id)
    setDuplicateName(`${name} (copy)`)
    setDuplicateDialogOpen(true)
  }

  const handleDuplicateConfirm = async () => {
    if (duplicateId !== null) {
      await onDuplicatePlan(duplicateId, duplicateName)
    }
    setDuplicateDialogOpen(false)
    setDuplicateId(null)
  }

  const handleDeleteClick = (id: number) => {
    setDeleteId(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (deleteId !== null) {
      await onDeletePlan(deleteId)
    }
    setDeleteConfirmOpen(false)
    setDeleteId(null)
  }

  const handleExport = () => {
    const plan = savedPlans.find((p) => p.id === currentPlanId)
    if (plan) {
      const json = exportTRPlan(plan)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${plan.name.replace(/[^a-z0-9]/gi, '_')}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const text = await file.text()
      try {
        const newId = await importTRPlan(text)
        await onLoadPlan(newId)
      } catch (error) {
        console.error('Failed to import plan:', error)
        alert('Failed to import plan. Make sure the file is a valid TR plan JSON.')
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handlePlanSelect = (event: SelectChangeEvent<number>) => {
    const id = event.target.value as number
    if (id > 0) {
      void onLoadPlan(id)
    }
  }

  const selectedPlan = savedPlans.find((p) => p.id === currentPlanId)

  // Compact mode for top bar
  if (compact) {
    return (
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            value={currentPlanName}
            onChange={(e) => onSetPlanName(e.target.value)}
            placeholder="Plan name"
            sx={{ width: 180 }}
          />
          <Tooltip title="Save">
            <IconButton size="small" onClick={handleSaveClick} color="primary">
              <SaveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="New">
            <IconButton size="small" onClick={onNewPlan}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {savedPlans.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Load Plan</InputLabel>
              <Select
                value={currentPlanId ?? 0}
                label="Load Plan"
                onChange={handlePlanSelect}
              >
                <MenuItem value={0} disabled>Select...</MenuItem>
                {savedPlans.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {selectedPlan && (
            <>
              <Tooltip title="Duplicate">
                <IconButton
                  size="small"
                  onClick={() => handleDuplicateClick(selectedPlan.id!, selectedPlan.name)}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={() => handleDeleteClick(selectedPlan.id!)}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}

          <Tooltip title="Import">
            <IconButton size="small" onClick={handleImport}>
              <FileUploadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export">
            <IconButton size="small" onClick={handleExport} disabled={currentPlanId === null}>
              <FileDownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            style={{ display: 'none' }}
          />
        </Box>

        {/* Dialogs */}
        <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
          <DialogTitle>Save Plan</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Plan Name"
              fullWidth
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveConfirm} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={duplicateDialogOpen} onClose={() => setDuplicateDialogOpen(false)}>
          <DialogTitle>Duplicate Plan</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="New Plan Name"
              fullWidth
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDuplicateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDuplicateConfirm} variant="contained">
              Duplicate
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
          <DialogTitle>Delete Plan</DialogTitle>
          <DialogContent>
            Are you sure you want to delete this plan?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} variant="contained" color="error">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </>
    )
  }

  // Full mode (original)
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          value={currentPlanName}
          onChange={(e) => onSetPlanName(e.target.value)}
          placeholder="Plan name"
          sx={{ flex: 1 }}
        />
        <Tooltip title="Save Plan">
          <IconButton onClick={handleSaveClick} color="primary">
            <SaveIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="New Plan">
          <IconButton onClick={onNewPlan}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FileUploadIcon />}
          onClick={handleImport}
        >
          Import
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={handleExport}
          disabled={currentPlanId === null}
        >
          Export
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          style={{ display: 'none' }}
        />
      </Box>

      {savedPlans.length > 0 && (
        <FormControl size="small" fullWidth sx={{ mb: 2 }}>
          <InputLabel>Saved Plans</InputLabel>
          <Select
            value={currentPlanId ?? 0}
            label="Saved Plans"
            onChange={handlePlanSelect}
          >
            <MenuItem value={0} disabled>Select a plan...</MenuItem>
            {savedPlans.map((plan) => (
              <MenuItem key={plan.id} value={plan.id}>
                {plan.name} ({plan.mode === 'heroic' ? 'Heroic' : 'Epic'}, {plan.selectedQuestIds.length} quests)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {selectedPlan && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={() => handleDuplicateClick(selectedPlan.id!, selectedPlan.name)}
          >
            Duplicate
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => handleDeleteClick(selectedPlan.id!)}
          >
            Delete
          </Button>
        </Box>
      )}

      {/* Dialogs */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Plan</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Plan Name"
            fullWidth
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveConfirm} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={duplicateDialogOpen} onClose={() => setDuplicateDialogOpen(false)}>
        <DialogTitle>Duplicate Plan</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Plan Name"
            fullWidth
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDuplicateConfirm} variant="contained">
            Duplicate
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Plan</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this plan?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
