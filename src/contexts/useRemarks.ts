import { createContext, useContext } from 'react'

import { CharacterData } from '@/api/ddoAudit'
import { CharacterRemark, RemarkInput } from '@/api/remarks'

export interface RemarksContextType {
  notes: CharacterRemark[]
  /** True once the notes have been fetched successfully for the current password. */
  loaded: boolean
  /** Bulk-hydrated data for every character id that appears in a note. */
  charactersById: Record<string, CharacterData>
  loading: boolean
  error: string
  /** Shared with the adventure log; empty until the user types it once. */
  password: string
  setPassword: (value: string) => void
  /** The note a character belongs to, whether it owns it or shares it as a smurf. */
  getNote: (characterName: string, characterId?: string | null) => CharacterRemark | undefined
  save: (input: RemarkInput) => Promise<CharacterRemark>
  remove: (characterId: string) => Promise<void>
  reload: () => Promise<void>
  dialog: { open: boolean; character?: string; characterId?: string }
  openFindCharacter: (character?: string, characterId?: string) => void
  closeFindCharacter: () => void
}

export const RemarksContext = createContext<RemarksContextType | null>(null)

export function useRemarks() {
  const context = useContext(RemarksContext)
  if (!context) throw new Error('useRemarks must be used within RemarksProvider')
  return context
}
