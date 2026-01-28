import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useRef,
  useState
} from 'react'

import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Tooltip,
  Typography
} from '@mui/material'

import { useGearPlanner } from '@/contexts/useGearPlanner'
import { useTrove } from '@/contexts/useTrove'

// ============================================================================
// Types
// ============================================================================

interface TroveImportDialogProps {
  open: boolean
  onClose: () => void
}

type ImportStep = 'upload' | 'complete'

// ============================================================================
// Component
// ============================================================================

export default function TroveImportDialog({
  open,
  onClose
}: TroveImportDialogProps) {
  const { items } = useGearPlanner()
  const {
    characters,
    importedAt,
    loading,
    error,
    importFiles,
    clearData,
    inventoryMap,
    getStats
  } = useTrove()

  const [step, setStep] = useState<ImportStep>(
    inventoryMap.size > 0 ? 'complete' : 'upload'
  )
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [importing, setImporting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset state when dialog opens
  const handleEnter = useCallback(() => {
    if (inventoryMap.size > 0) {
      setStep('complete')
    } else {
      setStep('upload')
    }
    setSelectedFiles([])
    setLocalError(null)
  }, [inventoryMap.size])

  // Drag handlers
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.toLowerCase().endsWith('.json')
    )

    if (files.length > 0) {
      setSelectedFiles(files)
    }
  }, [])

  // File input handler
  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) =>
      f.name.toLowerCase().endsWith('.json')
    )

    if (files.length > 0) {
      setSelectedFiles(files)
    }
  }, [])

  // Click to select files
  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Import files
  const handleImport = useCallback(async () => {
    if (selectedFiles.length === 0) return

    setImporting(true)
    setLocalError(null)

    try {
      await importFiles(selectedFiles)
      setStep('complete')
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Failed to import files'
      )
    } finally {
      setImporting(false)
    }
  }, [selectedFiles, importFiles])

  // Clear all data
  const handleClearData = useCallback(async () => {
    await clearData()
    setStep('upload')
    setSelectedFiles([])
  }, [clearData])

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  // Get stats (only count BTC equipment, not consumables)
  const equipmentNames = new Set(items.map((item) => item.name))
  const stats = getStats(equipmentNames)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onEnter: handleEnter }}
    >
      <DialogTitle>
        {step === 'upload' && 'Import Trove Data'}
        {step === 'complete' && 'Trove Data'}
      </DialogTitle>

      <DialogContent>
        {/* Upload Step */}
        {step === 'upload' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Import your DDO Helper Trove data to see which items you already
              own and filter the gear planner to only show available items.
            </Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                How to find your Trove data:
              </Typography>
              <Typography variant="body2" component="ol" sx={{ pl: 2, m: 0 }}>
                <li>
                  Open File Explorer and navigate to:
                  <br />
                  <code style={{ fontSize: '0.85em' }}>
                    %APPDATA%\Dungeon Helper\plugins\Trove\Shadowdale\&lt;AccountHash&gt;
                  </code>
                </li>
                <li>Select all JSON files in that folder</li>
                <li>Drag and drop them here, or click below to browse</li>
              </Typography>
            </Alert>

            {/* Drop Zone */}
            <Box
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleClickUpload}
              sx={{
                border: '2px dashed',
                borderColor: dragActive ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: dragActive ? 'action.hover' : 'transparent',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover'
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".json"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              {selectedFiles.length === 0 ? (
                <>
                  <CloudUploadIcon
                    sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
                  />
                  <Typography variant="body1" gutterBottom>
                    Drag and drop JSON files here
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    or click to select files
                  </Typography>
                </>
              ) : (
                <>
                  <FolderOpenIcon
                    sx={{ fontSize: 48, color: 'primary.main', mb: 1 }}
                  />
                  <Typography variant="body1" gutterBottom>
                    {selectedFiles.length} file(s) selected
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                    {selectedFiles.slice(0, 5).map((f) => (
                      <Chip key={f.name} label={f.name} size="small" />
                    ))}
                    {selectedFiles.length > 5 && (
                      <Chip
                        label={`+${selectedFiles.length - 5} more`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </>
              )}
            </Box>

            {(localError || error) && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {localError || error}
              </Alert>
            )}
          </Box>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CheckCircleIcon color="success" />
              <Typography variant="body1">Trove data imported</Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Unique items indexed:</strong> {inventoryMap.size}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Characters:</strong> {characters.length}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Unique BTA items:</strong> {stats.uniqueBTA}
            </Typography>
            {importedAt && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Imported at:</strong> {formatDate(importedAt)}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              BTC Equipment per Character
            </Typography>
            {characters.map((char) => {
              const count = stats.btcPerCharacter.get(char.id) || 0
              return (
                <Typography key={char.id} variant="body2" color="text.secondary">
                  {char.name}: {count} items
                </Typography>
              )
            })}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {step === 'upload' && (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={selectedFiles.length === 0 || importing || loading}
              startIcon={
                importing || loading ? (
                  <CircularProgress size={16} />
                ) : undefined
              }
            >
              {importing || loading ? 'Importing...' : 'Import'}
            </Button>
          </>
        )}

        {step === 'complete' && (
          <>
            <Tooltip title="Clear all imported data">
              <IconButton onClick={handleClearData} color="error" size="small">
                <DeleteIcon />
              </IconButton>
            </Tooltip>
            <Box sx={{ flex: 1 }} />
            <Button variant="text" onClick={() => setStep('upload')}>
              Import New Data
            </Button>
            <Button variant="contained" onClick={onClose}>
              Done
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
