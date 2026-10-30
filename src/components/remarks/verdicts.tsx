import BlockIcon from '@mui/icons-material/Block'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { SvgIconProps } from '@mui/material'
import { ComponentType } from 'react'

import { RemarkVerdict } from '@/api/remarks'

/**
 * Icon-only verdicts: no text label is ever shown, so the list stays compact and the
 * meaning comes from the icon and its colour. A thumbs-up (not a tick) for "good", so
 * it cannot be read as "done/completed" next to quest rows.
 */
export const VERDICT_ICON: Record<RemarkVerdict, ComponentType<SvgIconProps>> = {
  good: ThumbUpIcon,
  info: WarningAmberIcon,
  avoid: BlockIcon,
}

export const VERDICT_COLOR: Record<RemarkVerdict, SvgIconProps['color']> = {
  good: 'success',
  info: 'warning',
  avoid: 'error',
}
