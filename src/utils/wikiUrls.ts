/** DDO Wiki URL for a quest page: the quest name with spaces as underscores. */
export function getQuestWikiUrl(questName: string): string {
  return `https://ddowiki.com/page/${questName.replace(/\s+/g, '_')}`
}
