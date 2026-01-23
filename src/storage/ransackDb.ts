import Dexie, { Table } from 'dexie'

export interface RansackTimer {
  id?: number
  characterId: string
  characterName: string
  questId: string
  questName: string
  createdAt: string
  expiresAt: string
  playerName: string
}

class RansackDatabase extends Dexie {
  timers!: Table<RansackTimer>

  constructor() {
    super('ransack-timers')
    this.version(1).stores({
      timers: '++id, characterId, questId, playerName, expiresAt, [characterId+questId]',
    })
  }
}

export const ransackDb = new RansackDatabase()

export async function getAllRansackTimers(): Promise<RansackTimer[]> {
  return ransackDb.timers.toArray()
}

export async function getRansackTimersByPlayer(playerName: string): Promise<RansackTimer[]> {
  return ransackDb.timers.where('playerName').equals(playerName).toArray()
}

export async function addRansackTimer(timer: Omit<RansackTimer, 'id'>): Promise<number> {
  const existing = await ransackDb.timers
    .where('[characterId+questId]')
    .equals([timer.characterId, timer.questId])
    .first()

  if (existing?.id) {
    await ransackDb.timers.update(existing.id, timer)
    return existing.id
  }

  const id = await ransackDb.timers.add(timer)
  return id as number
}

export async function deleteRansackTimer(id: number): Promise<void> {
  await ransackDb.timers.delete(id)
}

export async function deleteExpiredTimers(): Promise<void> {
  const now = new Date().toISOString()
  await ransackDb.timers.where('expiresAt').below(now).delete()
}

export async function clearAllRansackTimers(): Promise<void> {
  await ransackDb.timers.clear()
}
