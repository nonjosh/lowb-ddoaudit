import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'

import { formatLocalDateTime } from '@/api/ddoAudit'
import { fetchServiceNews, SERVICE_NEWS_URL, ServiceNewsItem } from '@/api/ddoNews'

interface ServiceNewsDialogProps {
  open: boolean
  onClose: () => void
}

export default function ServiceNewsDialog({ open, onClose }: ServiceNewsDialogProps) {
  const [items, setItems] = useState<ServiceNewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await fetchServiceNews())
    } catch (e) {
      const err = e as Error
      setError(err?.message || 'Could not load service news.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box
          component="span"
          aria-hidden
          sx={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: 'error.main',
            mr: 1,
          }}
        />
        Shadowdale is offline
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Latest service news from the DDO forums.
        </Typography>

        {loading && (
          <Stack alignItems="center" sx={{ py: 3 }}>
            <CircularProgress size={28} />
          </Stack>
        )}

        {!loading && error && (
          <Alert severity="warning">
            Could not load service news.{' '}
            <Link href={SERVICE_NEWS_URL} target="_blank" rel="noreferrer">
              Open the forums
            </Link>
          </Alert>
        )}

        {!loading && !error && (
          <List dense disablePadding>
            {items.map((item) => (
              <ListItem key={item.link || item.title} disableGutters alignItems="flex-start">
                <ListItemText
                  primary={
                    <Link href={item.link} target="_blank" rel="noreferrer" underline="hover">
                      {item.title}
                    </Link>
                  }
                  secondary={
                    <>
                      <Typography component="span" variant="caption" color="text.secondary">
                        {formatLocalDateTime(item.publishedAt)}
                      </Typography>
                      {item.summary && (
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          {item.summary}
                        </Typography>
                      )}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
