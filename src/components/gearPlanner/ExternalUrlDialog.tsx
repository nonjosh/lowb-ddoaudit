import { useCallback, useState } from 'react'

import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'

import { CraftingData } from '@/api/ddoGearPlanner/crafting'
import { Item } from '@/api/ddoGearPlanner/items'
import { SetsData } from '@/api/ddoGearPlanner/sets'
import {
  exportToExternalUrl,
  formatImportSummary,
  importFromExternalUrl,
  ImportResult,
  isExternalGearPlannerUrl,
} from '@/domains/gearPlanner/externalUrl'
import { GearCraftingSelections } from '@/domains/gearPlanner/craftingHelpers'
import { GearSetup } from '@/domains/gearPlanner/gearSetup'
import { calculateScore, OptimizedGearSetup } from '@/domains/gearPlanner/optimization'

interface ExternalUrlDialogProps {
  open: boolean
  onClose: () => void
  /** All loaded items for import resolution */
  items: Item[]
  craftingData: CraftingData | null
  setsData: SetsData | null
  /** Current gear setup for export */
  currentSetup?: GearSetup
  /** Current crafting selections for export */
  currentCraftingSelections?: GearCraftingSelections
  /** Currently selected properties */
  selectedProperties: string[]
  /** Current maxML setting */
  maxML: number
  excludeSetAugments: boolean
  /** Called when a gear setup is imported */
  onImport: (result: OptimizedGearSetup, trackedProperties?: string[]) => void
}

export default function ExternalUrlDialog({
  open,
  onClose,
  items,
  craftingData,
  setsData,
  currentSetup,
  currentCraftingSelections,
  selectedProperties,
  maxML,
  excludeSetAugments,
  onImport,
}: ExternalUrlDialogProps) {
  const [tabIndex, setTabIndex] = useState(0)
  const [importUrl, setImportUrl] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  const exportUrl = currentSetup
    ? exportToExternalUrl(currentSetup, currentCraftingSelections, selectedProperties, maxML)
    : ''

  const handleImport = useCallback(() => {
    setImportError(null)
    setImportSummary(null)

    if (!importUrl.trim()) {
      setImportError('Please paste a ddo-gear-planner URL')
      return
    }

    if (!isExternalGearPlannerUrl(importUrl)) {
      setImportError('URL does not appear to be from ddo-gear-planner.netlify.app')
      return
    }

    const result: ImportResult | null = importFromExternalUrl(importUrl, items, craftingData)
    if (!result) {
      setImportError('Failed to parse the URL. Please check it is a valid ddo-gear-planner link.')
      return
    }

    const summary = formatImportSummary(result)
    setImportSummary(summary)

    // Calculate score for the imported setup
    const scoreResult = calculateScore(
      result.setup,
      selectedProperties.length > 0 ? selectedProperties : result.trackedProperties,
      setsData,
      craftingData,
      excludeSetAugments,
      [],
      [],
      Object.keys(result.craftingSelections).length > 0 ? result.craftingSelections : undefined
    )

    const optimizedSetup: OptimizedGearSetup = {
      setup: result.setup,
      score: scoreResult.score,
      propertyValues: scoreResult.propertyValues,
      unusedAugments: scoreResult.unusedAugments,
      totalAugments: scoreResult.totalAugments,
      extraProperties: scoreResult.extraProperties,
      otherEffects: scoreResult.otherEffects,
      activeSets: scoreResult.activeSets,
      craftingSelections: Object.keys(result.craftingSelections).length > 0
        ? result.craftingSelections
        : scoreResult.craftingSelections,
    }

    onImport(optimizedSetup, result.trackedProperties.length > 0 ? result.trackedProperties : undefined)
    setImportUrl('')
    onClose()
  }, [importUrl, items, craftingData, setsData, selectedProperties, excludeSetAugments, onImport, onClose])

  const handleCopyExportUrl = useCallback(() => {
    void navigator.clipboard.writeText(exportUrl).then(() => {
      setSnackbar({ open: true, message: 'URL copied to clipboard' })
    })
  }, [exportUrl])

  const handleOpenExternal = useCallback(() => {
    window.open(exportUrl, '_blank', 'noopener,noreferrer')
  }, [exportUrl])

  const handleClose = useCallback(() => {
    setImportError(null)
    setImportSummary(null)
    setImportUrl('')
    onClose()
  }, [onClose])

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>DDO Gear Planner - Import / Export</DialogTitle>
        <DialogContent>
          <Tabs value={tabIndex} onChange={(_, v: number) => setTabIndex(v)} sx={{ mb: 2 }}>
            <Tab icon={<FileUploadIcon />} label="Import" iconPosition="start" />
            <Tab
              icon={<FileDownloadIcon />}
              label="Export"
              iconPosition="start"
              disabled={!currentSetup || Object.values(currentSetup).filter(Boolean).length === 0}
            />
          </Tabs>

          {/* Import Tab */}
          {tabIndex === 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Paste a URL from{' '}
                <a href="https://ddo-gear-planner.netlify.app" target="_blank" rel="noopener noreferrer">
                  ddo-gear-planner.netlify.app
                </a>{' '}
                to import a gear setup.
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={3}
                maxRows={6}
                label="ddo-gear-planner URL"
                placeholder="https://ddo-gear-planner.netlify.app/#/main?..."
                value={importUrl}
                onChange={(e) => {
                  setImportUrl(e.target.value)
                  setImportError(null)
                  setImportSummary(null)
                }}
                error={!!importError}
                helperText={importError}
                sx={{ mb: 2 }}
              />
              {importSummary && (
                <Alert severity="success" sx={{ mb: 1 }}>
                  {importSummary}
                </Alert>
              )}
            </Box>
          )}

          {/* Export Tab */}
          {tabIndex === 1 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Share your current gear setup via ddo-gear-planner URL.
              </Typography>
              {currentSetup && Object.values(currentSetup).filter(Boolean).length > 0 ? (
                <>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    maxRows={6}
                    label="ddo-gear-planner URL"
                    value={exportUrl}
                    slotProps={{
                      input: { readOnly: true },
                    }}
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<ContentCopyIcon />}
                      onClick={handleCopyExportUrl}
                    >
                      Copy URL
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<OpenInNewIcon />}
                      onClick={handleOpenExternal}
                    >
                      Open in ddo-gear-planner
                    </Button>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No gear setup to export. Select or optimize gear first.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {tabIndex === 0 && (
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!importUrl.trim()}
            >
              Import
            </Button>
          )}
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </>
  )
}
