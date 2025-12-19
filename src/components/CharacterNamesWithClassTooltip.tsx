import { Tooltip } from '@mui/material'
import { formatClasses } from '../raidLogic'

interface CharacterItem {
  id?: string
  name?: string
  classes?: any
}

interface CharacterNamesWithClassTooltipProps {
  items: CharacterItem[]
}

export default function CharacterNamesWithClassTooltip({ items }: CharacterNamesWithClassTooltipProps) {
  const list = Array.isArray(items) ? items : []

  return (
    <>
      {list.map((item, idx) => {
        const key = item?.id ?? item?.name ?? `item-${idx}`
        const name = item?.name ?? 'Unknown'
        const isLast = idx === list.length - 1
        return (
          <span key={key}>
            <Tooltip title={formatClasses(item?.classes)}>
              <span style={{ cursor: 'help' }}>{name}</span>
            </Tooltip>
            {!isLast ? ', ' : ''}
          </span>
        )
      })}
    </>
  )
}
