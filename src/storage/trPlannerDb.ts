import Dexie, { Table } from 'dexie'

import { PlanMode, TRTier } from '@/domains/trPlanner/levelRequirements'
import { XPBonusConfig } from '@/domains/trPlanner/xpCalculator'

/**
 * TR Plan stored in IndexedDB
 */
export interface TRPlan {
  id?: number
  name: string
  mode: PlanMode
  trTier: TRTier
  bonuses: XPBonusConfig
  selectedQuestIds: string[]
  selectedPackNames: string[]
  createdAt: string
  updatedAt: string
}

class TRPlannerDatabase extends Dexie {
  plans!: Table<TRPlan>

  constructor() {
    super('tr-planner')
    this.version(1).stores({
      plans: '++id, name, mode, createdAt, updatedAt',
    })
  }
}

export const trPlannerDb = new TRPlannerDatabase()

/**
 * Get all TR plans
 */
export async function getAllTRPlans(): Promise<TRPlan[]> {
  return trPlannerDb.plans.orderBy('updatedAt').reverse().toArray()
}

/**
 * Get a TR plan by ID
 */
export async function getTRPlanById(id: number): Promise<TRPlan | undefined> {
  return trPlannerDb.plans.get(id)
}

/**
 * Save a new TR plan
 */
export async function createTRPlan(plan: Omit<TRPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const now = new Date().toISOString()
  const id = await trPlannerDb.plans.add({
    ...plan,
    createdAt: now,
    updatedAt: now,
  })
  return id as number
}

/**
 * Update an existing TR plan
 */
export async function updateTRPlan(id: number, updates: Partial<Omit<TRPlan, 'id' | 'createdAt'>>): Promise<void> {
  await trPlannerDb.plans.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Delete a TR plan
 */
export async function deleteTRPlan(id: number): Promise<void> {
  await trPlannerDb.plans.delete(id)
}

/**
 * Duplicate a TR plan
 */
export async function duplicateTRPlan(id: number, newName: string): Promise<number> {
  const original = await getTRPlanById(id)
  if (!original) {
    throw new Error('Plan not found')
  }

  const { id: _, createdAt: __, updatedAt: ___, ...planData } = original
  return createTRPlan({
    ...planData,
    name: newName,
  })
}

/**
 * Export a plan to JSON
 */
export function exportTRPlan(plan: TRPlan): string {
  return JSON.stringify(plan, null, 2)
}

/**
 * Import a plan from JSON
 */
export async function importTRPlan(json: string): Promise<number> {
  const parsed = JSON.parse(json) as TRPlan
  // Remove id to create a new entry
  const { id: _, ...planData } = parsed
  return createTRPlan(planData)
}
