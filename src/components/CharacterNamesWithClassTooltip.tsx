import { memo } from 'react'
import { Tooltip } from '@mui/material'

import { formatClasses } from '../raidLogic'
import ClassDisplay from './ClassDisplay'

interface CharacterItem {
  id?: string
  name?: string
  classes?: any
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
        
        const title = showClassIcons 
          ? <ClassDisplay classes={item?.classes} showIcons={true} />
          : formatClasses(item?.classes)

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
