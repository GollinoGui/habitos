// Thin wrappers around window.api.challenges for cloud-persisting daily challenge state.
// All calls are fire-and-forget — localStorage remains the source of truth during the session.

type ChallengesApi = {
  get: (date: string, key: string) => Promise<Record<string, unknown> | null>
  save: (date: string, key: string, state: object) => Promise<void>
}

function api(): ChallengesApi | null {
  return (window as { api?: { challenges?: ChallengesApi } }).api?.challenges ?? null
}

export function cloudSave(date: string, key: string, state: object): void {
  void api()?.save(date, key, state)
}

export async function cloudLoad(date: string, key: string): Promise<Record<string, unknown> | null> {
  try {
    return await api()?.get(date, key) ?? null
  } catch {
    return null
  }
}
