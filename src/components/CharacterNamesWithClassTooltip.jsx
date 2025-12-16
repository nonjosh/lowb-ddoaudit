import { formatClasses } from '../raidLogic'

export default function CharacterNamesWithClassTooltip({ items }) {
  const list = Array.isArray(items) ? items : []

  return (
    <>
      {list.map((item, idx) => {
        const key = item?.id ?? item?.name ?? `item-${idx}`
        const name = item?.name ?? 'Unknown'
        return (
          <span key={key} title={formatClasses(item?.classes)}>
            {idx ? ', ' : ''}
            {name}
          </span>
        )
      })}
    </>
  )
}
