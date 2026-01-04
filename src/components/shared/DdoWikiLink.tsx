import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { Link, Tooltip } from '@mui/material'

interface DdoWikiLinkProps {
  questName?: string
  wikiUrl?: string
}

export default function DdoWikiLink({ questName, wikiUrl }: DdoWikiLinkProps) {
  const url = wikiUrl || (questName ? `https://ddowiki.com/page/${questName.replace(/\s+/g, '_')}` : '')

  if (!url) return null

  return (
    <Tooltip title="Open in DDO Wiki">
      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        color="inherit"
        sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
      >
        <OpenInNewIcon sx={{ fontSize: 16 }} />
      </Link>
    </Tooltip>
  )
}
