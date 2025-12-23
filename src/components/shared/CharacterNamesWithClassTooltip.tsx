import { Tooltip } from '@mui/material'
import { memo } from 'react'

import { CharacterClass, formatClasses } from '../../domains/raids/raidLogic'
import ClassDisplay from './ClassDisplay'

interface CharacterItem {
  id?: string
  name?: string
  classes?: CharacterClass[]
}

interface CharacterNamesWithClassTooltipProps {
  items: CharacterItem[]
  showClassIcons?: boolean
}

function CharacterNamesWithClassTooltip({ items, showClassIcons }: CharacterNamesWithClassTooltipProps) {
  const list = Array.isArray(items) ? items : []

  return (
    <>
      {list.map((item, idx) => {
        const key = item?.id ?? item?.name ?? `item-${idx}`
        const name = item?.name ?? 'Unknown'
        const isLast = idx === list.length - 1

        const safeClasses = Array.isArray(item?.classes) ? item.classes : []
        const title = showClassIcons
          ? <ClassDisplay classes={safeClasses} showIcons={true} />
          : formatClasses(safeClasses)

        return (
          <span key={key}>
            <Tooltip title={title}>
              <span style={{ cursor: 'help' }}>{name}</span>
            </Tooltip>
            {!isLast ? ', ' : ''}
          </span>
        )
      })}
    </>
  )
}

export default memo(CharacterNamesWithClassTooltip)
