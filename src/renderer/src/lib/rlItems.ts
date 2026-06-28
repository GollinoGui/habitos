import { products, slots as slotsMap, qualities as qualitiesMap } from '@rocketleagueapi/items'

export interface RLItemDef {
  name: string
  rarity: string
}

// Slot numbers → our slot keys
const SLOT_MAP: Record<number, string> = {
  0:  'body',
  1:  'decal',
  2:  'wheels',
  3:  'boost',
  5:  'topper',
  15: 'goalExplosion',
}

// Quality numbers → rarity strings
const QUALITY_MAP: Record<number, string> = {
  0: 'common',
  1: 'uncommon',
  2: 'rare',
  3: 'very_rare',
  4: 'import',
  5: 'exotic',
  6: 'black_market',
  7: 'premium',
  8: 'limited',
  9: 'legacy',
}

// Rarity sort order (best first)
const RARITY_ORDER: Record<string, number> = {
  black_market: 0,
  exotic: 1,
  import: 2,
  very_rare: 3,
  rare: 4,
  uncommon: 5,
  common: 6,
  premium: 7,
  limited: 8,
  legacy: 9,
}

function buildItems(): Record<string, RLItemDef[]> {
  const result: Record<string, RLItemDef[]> = {
    body: [], decal: [], wheels: [], boost: [], topper: [], goalExplosion: [],
  }

  const all = Object.values(products as Record<string, {
    name: string; slot: number; quality: number; blueprint: boolean; currency: boolean; special: number
  }>)

  for (const item of all) {
    const slotKey = SLOT_MAP[item.slot]
    if (!slotKey) continue
    if (item.blueprint || item.currency) continue
    const rarity = QUALITY_MAP[item.quality] ?? 'common'
    result[slotKey].push({ name: item.name, rarity })
  }

  // Sort each slot: rarity desc, then name asc
  for (const key of Object.keys(result)) {
    result[key].sort((a, b) => {
      const rd = (RARITY_ORDER[a.rarity] ?? 9) - (RARITY_ORDER[b.rarity] ?? 9)
      if (rd !== 0) return rd
      return a.name.localeCompare(b.name)
    })
    // Remove duplicates by name
    result[key] = result[key].filter((item, i, arr) => i === 0 || arr[i - 1].name !== item.name)
  }

  return result
}

export const RL_ITEMS: Record<string, RLItemDef[]> = buildItems()

export function searchItems(slotKey: string, query: string): RLItemDef[] {
  const list = RL_ITEMS[slotKey] ?? []
  const q = query.toLowerCase().trim()
  if (!q) return []
  return list
    .filter(item => item.name.toLowerCase().includes(q))
    .slice(0, 8)
}

// Expose slot/quality labels for display if needed
export { slotsMap, qualitiesMap }
