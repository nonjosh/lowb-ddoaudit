import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import { WritePasswordRejectedError } from '@/api/adventureLog'
import { ADVENTURE_LOG_PASSWORD_STORAGE_KEY } from '@/api/adventureLog/constants'
import { CharacterData, fetchCharactersByIds } from '@/api/ddoAudit'
import {
  CharacterRemark,
  RemarkInput,
  deleteRemark,
  fetchRemarks,
  remarkKey,
  saveRemark,
} from '@/api/remarks'
import { RemarksContext } from './useRemarks'

function readStoredPassword(): string {
  try {
    return localStorage.getItem(ADVENTURE_LOG_PASSWORD_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function storePassword(value: string): void {
  try {
    if (value) localStorage.setItem(ADVENTURE_LOG_PASSWORD_STORAGE_KEY, value)
    else localStorage.removeItem(ADVENTURE_LOG_PASSWORD_STORAGE_KEY)
  } catch {
    // Storage can be blocked; the password still works for this page view.
  }
}

export function RemarksProvider({ children }: { children: ReactNode }) {
  const [password, setPasswordState] = useState(readStoredPassword)
  const [notes, setNotes] = useState<CharacterRemark[]>([])
  /** True only after a successful load: without it the UI cannot tell "no notes" from "not loaded". */
  const [loaded, setLoaded] = useState(false)
  const [charactersById, setCharactersById] = useState<Record<string, CharacterData>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState<{ open: boolean; character?: string; characterId?: string }>({ open: false })

  const load = useCallback(async (pwd: string, spinner: boolean) => {
    if (!pwd) {
      setNotes([])
      setLoaded(false)
      return
    }

    if (spinner) setLoading(true)
    try {
      const list = await fetchRemarks(pwd)
      setNotes(list)
      setLoaded(true)
      setError('')
    } catch (cause) {
      if (cause instanceof WritePasswordRejectedError) {
        // Forget the password in memory only: the same key unlocks the adventure log,
        // and a 401 here must not sign the user out there.
        setPasswordState('')
        setError('Password rejected')
      } else {
        setError(cause instanceof Error ? cause.message : String(cause))
      }
      // Only a user-visible load may blank the panes; a failed background resync keeps
      // the last good list (the save it followed already succeeded).
      if (spinner) setLoaded(false)
    } finally {
      if (spinner) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(password, true)
  }, [password, load])

  // Every character of every note, fetched in one bulk request, so level/classes/
  // last-online are fresh after a reload without a lookup per name.
  useEffect(() => {
    const ids = [...new Set(notes.flatMap((note) => note.smurfs.map((smurf) => smurf.id)))]
      .filter((id): id is string => Boolean(id))
      .filter((id) => !charactersById[id])
    if (!ids.length) return

    let cancelled = false
    void fetchCharactersByIds(ids)
      .then((data) => {
        if (cancelled) return
        setCharactersById((previous) => {
          const next = { ...previous, ...data }
          // Keep the same object when nothing arrived: an id the API does not know
          // must not re-trigger this effect forever.
          return Object.keys(next).length === Object.keys(previous).length ? previous : next
        })
      })
      .catch(() => {
        // A failed hydrate only means the stored snapshots are shown instead.
      })
    return () => {
      cancelled = true
    }
  }, [notes, charactersById])

  const setPassword = useCallback((value: string) => {
    storePassword(value)
    setError('')
    setPasswordState(value)
  }, [])

  /** Keyed by both `id:<id>` and `name:<lower-cased name>`, so any caller can look up. */
  const index = useMemo(() => {
    const map = new Map<string, CharacterRemark>()
    for (const note of notes) {
      map.set(`id:${note.characterId}`, note)
      map.set(`name:${remarkKey(note.characterName)}`, note)
      for (const smurf of note.smurfs) {
        if (smurf.id) map.set(`id:${smurf.id}`, note)
        map.set(`name:${remarkKey(smurf.name)}`, note)
      }
    }
    return map
  }, [notes])

  const getNote = useCallback(
    (characterName: string, characterId?: string | null) => {
      const byId = characterId ? index.get(`id:${characterId}`) : undefined
      return byId ?? index.get(`name:${remarkKey(characterName)}`)
    },
    [index],
  )

  const reload = useCallback(async () => {
    await load(password, true)
  }, [load, password])

  const save = useCallback(
    async (input: RemarkInput) => {
      const saved = await saveRemark(input, password)
      // Another note may have lost a character to this one, so resync instead of guessing.
      await load(password, false)
      return saved
    },
    [load, password],
  )

  const remove = useCallback(
    async (characterId: string) => {
      await deleteRemark(characterId, password)
      await load(password, false)
    },
    [load, password],
  )

  const openFindCharacter = useCallback((character?: string, characterId?: string) => {
    // The adventure-log page writes the same key; pick it up without a remount.
    if (!password) {
      const stored = readStoredPassword()
      if (stored) setPasswordState(stored)
    }
    setDialog({ open: true, character, characterId })
  }, [password])

  const closeFindCharacter = useCallback(() => {
    setDialog({ open: false })
  }, [])

  return (
    <RemarksContext.Provider
      value={{
        notes,
        loaded,
        charactersById,
        loading,
        error,
        password,
        setPassword,
        getNote,
        save,
        remove,
        reload,
        dialog,
        openFindCharacter,
        closeFindCharacter,
      }}
    >
      {children}
    </RemarksContext.Provider>
  )
}
