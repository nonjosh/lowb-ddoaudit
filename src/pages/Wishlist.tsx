import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import FavoriteIcon from '@mui/icons-material/Favorite'
import {
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMemo } from 'react'

import DdoWikiLink from '@/components/shared/DdoWikiLink'
import { useWishlist } from '@/contexts/useWishlist'

function getWikiUrl(url: string | undefined) {
  if (!url) return null
  const urlStr = url.trim()
  if ((urlStr.startsWith('/page/') || urlStr.startsWith('/Page/')) &&
    !urlStr.includes('..') &&
    !urlStr.includes('//')) {
    return `https://ddowiki.com${urlStr}`
  }
  return null
}

export default function Wishlist() {
  const { entriesByKey, keys, removeWish, clearAll } = useWishlist()

  const entries = useMemo(() => {
    return keys.map((k) => entriesByKey[k]).filter(Boolean)
  }, [entriesByKey, keys])

  return (
    <Container maxWidth={false} sx={{ py: 4, px: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h5" sx={{ mb: 0 }}>
          Wish List
        </Typography>
        <Chip size="small" variant="outlined" label={entries.length} />

        <Box sx={{ ml: 'auto' }}>
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            startIcon={<DeleteSweepIcon />}
            disabled={entries.length === 0}
            onClick={() => {
              if (window.confirm('Clear all items from your wish list?')) {
                clearAll()
              }
            }}
          >
            Clear All
          </Button>
        </Box>
      </Box>

      {!entries.length ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Your wish list is empty. Add items using the heart button in quest loot or the Item Wiki.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="wish list table">
            <TableHead>
              <TableRow>
                <TableCell width={70}>ML</TableCell>
                <TableCell width={360}>Item</TableCell>
                <TableCell width={180}>Type</TableCell>
                <TableCell>Quests</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((e) => {
                const wikiUrl = getWikiUrl(e.url)
                const displayType = e.slot === 'Augment'
                  ? `Augment (${e.type ?? ''})`
                  : (e.slot && e.slot !== 'Weapon' && e.slot !== 'Offhand')
                    ? e.slot
                    : (e.type ?? '')

                return (
                  <TableRow key={e.key} hover>
                    <TableCell>{e.ml}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="body2" fontWeight={700}>
                          {e.name}
                        </Typography>
                        <Tooltip title="Remove from wish list">
                          <IconButton
                            size="small"
                            onClick={() => removeWish(e.key)}
                            aria-label="remove from wish list"
                            sx={{ p: 0.25 }}
                          >
                            <FavoriteIcon fontSize="small" sx={{ color: 'error.main' }} />
                          </IconButton>
                        </Tooltip>
                        {wikiUrl ? <DdoWikiLink wikiUrl={wikiUrl} /> : null}
                      </Stack>
                      {e.slot === 'Weapon' || e.slot === 'Offhand' ? (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {e.slot}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {displayType || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {Array.isArray(e.quests) && e.quests.length ? (
                        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                          {e.quests.slice(0, 6).map((q) => (
                            <Chip key={`${e.key}:${q}`} size="small" variant="outlined" label={q} />
                          ))}
                          {e.quests.length > 6 ? (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`+${e.quests.length - 6} more`}
                            />
                          ) : null}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  )
}
