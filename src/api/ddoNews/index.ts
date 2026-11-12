export const SERVICE_NEWS_URL = 'https://forums.ddo.com/index.php?forums/service-news.6/'

/**
 * DDO forum "Service News" RSS. The forum answers with `Access-Control-Allow-Origin: *`,
 * so it is the only official downtime source a browser can read directly.
 * `https://www.ddo.com` embeds the same notices but sends no CORS header.
 */
const SERVICE_NEWS_FEED_URL = 'https://forums.ddo.com/index.php?forums/service-news.6/index.rss'

export interface ServiceNewsItem {
  title: string
  link: string
  publishedAt: string
  summary: string
}

export async function fetchServiceNews(limit = 8): Promise<ServiceNewsItem[]> {
  const resp = await fetch(SERVICE_NEWS_FEED_URL, { signal: AbortSignal.timeout(15_000) })
  if (!resp.ok) throw new Error(`Failed to fetch service news (${resp.status})`)

  const doc = new DOMParser().parseFromString(await resp.text(), 'application/xml')
  const items = Array.from(doc.getElementsByTagName('item')).slice(0, limit)

  // An empty list means the feed moved (forum id changed) or parsed as an error page.
  if (!items.length) throw new Error('No service news found')

  return items.map((item) => ({
    title: textOf(item, 'title'),
    link: textOf(item, 'link'),
    publishedAt: textOf(item, 'pubDate'),
    summary: htmlToText(textOf(item, 'content:encoded')),
  }))
}

function textOf(parent: Element, tagName: string): string {
  return parent.getElementsByTagName(tagName)[0]?.textContent?.trim() ?? ''
}

// textContent, never innerHTML: this markup comes from a third-party feed.
function htmlToText(html: string): string {
  if (!html) return ''
  const body = new DOMParser().parseFromString(html, 'text/html').body
  return (body.textContent ?? '').replace(/\s+/g, ' ').trim()
}
