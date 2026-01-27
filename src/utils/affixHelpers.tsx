import { ReactElement } from 'react'

import type { ItemAffix } from '@/api/ddoGearPlanner'

export interface AffixLike {
  name: string
  type?: string
  value?: string | number
}

/**
 * Format an affix as a plain text string (for search matching, etc.)
 */
export function formatAffixPlain(affix: AffixLike): string {
  let text = affix.name
  if (affix.value && affix.value !== 1 && affix.value !== '1') {
    text += ` +${affix.value}`
  }
  if (affix.type && affix.type !== 'bool') {
    text += ` (${affix.type})`
  }
  return text
}

/**
 * Highlight text with a search query, wrapping matches in <mark> tags.
 */
export function highlightText(text: string, query: string): string | ReactElement {
  if (!query) return text
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerText.indexOf(lowerQuery)
  if (index === -1) return text
  const before = text.slice(0, index)
  const match = text.slice(index, index + query.length)
  const after = text.slice(index + query.length)
  return <>{before}<mark>{match}</mark>{after}</>
}

/**
 * Format an affix for display, optionally with search highlighting.
 */
export function formatAffix(affix: ItemAffix, query: string = ''): string | ReactElement {
  let text = highlightText(affix.name, query)
  if (affix.value && affix.value !== 1 && affix.value !== '1') {
    text = <>{text} +{affix.value}</>
  }
  if (affix.type && affix.type !== 'bool') {
    text = <>{text} ({affix.type})</>
  }
  return text
}

/**
 * Get the display color for an augment based on its type/slot.
 */
export function getAugmentColor(text: string): string | undefined {
  const lower = text.toLowerCase()
  if (lower.includes('blue augment slot')) return '#2196f3'
  if (lower.includes('red augment slot')) return '#f44336'
  if (lower.includes('yellow augment slot')) return '#ffeb3b'
  if (lower.includes('green augment slot')) return '#4caf50'
  if (lower.includes('purple augment slot')) return '#9c27b0'
  if (lower.includes('orange augment slot')) return '#ff9800'
  if (lower.includes('colorless augment slot')) return '#e0e0e0'
  if (lower.includes('moon augment slot')) return '#b0bec5'
  if (lower.includes('sun augment slot')) return '#ffc107'
  return undefined
}

/**
 * Get a wiki URL from a relative path.
 */
export function getWikiUrl(url: string | undefined): string | null {
  if (!url) return null
  const urlStr = url.trim()
  if ((urlStr.startsWith('/page/') || urlStr.startsWith('/Page/')) &&
    !urlStr.includes('..') &&
    !urlStr.includes('//')) {
    return `https://ddowiki.com${urlStr}`
  }
  return null
}
