import { Tooltip } from '@mui/material'
import { formatClasses } from '../raidLogic'

export default function CharacterNamesWithClassTooltip({ items }) {
  const list = Array.isArray(items) ? items : []

  return (
    <>
      {list.map((item, idx) => {
        const key = item?.id ?? item?.name ?? `item-${idx}`
        const name = item?.name ?? 'Unknown'
        return (
          <span key={key}>
            {idx ? ', ' : ''}
            <Tooltip title={formatClasses(item?.classes)}>
              <span style={{ cursor: 'help' }}>{name}</span>
            </Tooltip>
          </span>
        )
      })}
    </>
  )
}
