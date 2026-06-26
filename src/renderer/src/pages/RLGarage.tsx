import React, { useEffect, useRef, useState } from 'react'
import { Trash2, Plus, Check, X, Sparkles } from 'lucide-react'
import { searchItems, type RLItemDef } from '../lib/rlItems'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RLCarSlot {
  name: string
  rarity: string
}

export interface RLCarPreset {
  id: number
  name: string
  slots: Record<string, RLCarSlot>
  created_at: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const CAR_SLOTS = [
  { key: 'body',          label: 'Body',         emoji: '🚗' },
  { key: 'decal',         label: 'Decal',        emoji: '🎨' },
  { key: 'wheels',        label: 'Rodas',        emoji: '⚙️' },
  { key: 'boost',         label: 'Boost',        emoji: '🔥' },
  { key: 'topper',        label: 'Topper',       emoji: '🎩' },
  { key: 'antenna',       label: 'Antena',       emoji: '📡' },
  { key: 'goalExplosion', label: 'Goal Expl.',   emoji: '💥' },
  { key: 'trail',         label: 'Rastro',       emoji: '🌀' },
]

export const RARITIES = [
  { key: 'common',       label: 'Common',       color: '#6b7280', glow: 'rgba(107,114,128,0.45)' },
  { key: 'uncommon',     label: 'Uncommon',     color: '#4ade80', glow: 'rgba(74,222,128,0.45)'  },
  { key: 'rare',         label: 'Rare',         color: '#3b82f6', glow: 'rgba(59,130,246,0.45)'  },
  { key: 'very_rare',    label: 'Very Rare',    color: '#8b5cf6', glow: 'rgba(139,92,246,0.45)'  },
  { key: 'import',       label: 'Import',       color: '#ef4444', glow: 'rgba(239,68,68,0.45)'   },
  { key: 'exotic',       label: 'Exotic',       color: '#f59e0b', glow: 'rgba(245,158,11,0.55)'  },
  { key: 'black_market', label: 'Black Market', color: '#ec4899', glow: 'rgba(236,72,153,0.55)'  },
]

export function getRarityDef(key: string) {
  return RARITIES.find(r => r.key === key) ?? RARITIES[0]
}

const RARITY_ORDER = RARITIES.map(r => r.key)

function topRarity(slots: Record<string, RLCarSlot>): string {
  return Object.values(slots).reduce<string>(
    (best, item) =>
      RARITY_ORDER.indexOf(item.rarity) > RARITY_ORDER.indexOf(best) ? item.rarity : best,
    'common'
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const GARAGE_STYLES = `
  @keyframes rlg-enter {
    from { opacity: 0; transform: translateX(40px) scale(0.97); }
    to   { opacity: 1; transform: translateX(0)   scale(1);    }
  }
  @keyframes rlg-boost {
    0%,100% { opacity: 0.5;  transform: scaleX(1)    scaleY(1);   }
    50%      { opacity: 0.95; transform: scaleX(1.2)  scaleY(1.6); }
  }
  @keyframes rlg-rainbow {
    0%   { filter: hue-rotate(0deg)   brightness(1.15); }
    100% { filter: hue-rotate(360deg) brightness(1.15); }
  }
  @keyframes rlg-gold {
    0%,100% { filter: brightness(1);    opacity: 0.82; }
    50%      { filter: brightness(1.35); opacity: 1;    }
  }
  @keyframes rlg-import-glow {
    0%,100% { box-shadow: 0 0 6px rgba(239,68,68,0.2); }
    50%      { box-shadow: 0 0 18px rgba(239,68,68,0.6); }
  }
  @keyframes rlg-preset-glow {
    0%,100% { opacity: 0.7; }
    50%      { opacity: 1;   }
  }

  .rlg-enter         { animation: rlg-enter 0.55s cubic-bezier(0.16,1,0.3,1) both; }
  .rlg-bm            { animation: rlg-rainbow 3s linear infinite; }
  .rlg-exotic        { animation: rlg-gold    2s ease-in-out infinite; }
  .rlg-import        { animation: rlg-import-glow 2s ease-in-out infinite; }

  .rlg-slot          { transition: transform 0.14s ease, box-shadow 0.14s ease; }
  .rlg-slot:hover    { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }

  .rlg-preset        { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
  .rlg-preset:hover  { transform: translateY(-4px); }

  .rlg-rbtn          { transition: transform 0.1s ease, box-shadow 0.1s ease; }
  .rlg-rbtn:hover    { transform: scale(1.05); }
  .rlg-rbtn.sel      { transform: scale(1.08); }
`

// ── Hitbox system ─────────────────────────────────────────────────────────────

type HitboxType = 'octane' | 'dominus' | 'plank' | 'breakout' | 'hybrid'

const HITBOX_MAP: Record<string, HitboxType> = {
  // Octane
  Octane: 'octane', Backfire: 'octane', Gizmo: 'octane', Marauder: 'octane',
  Scarab: 'octane', Takumi: 'octane', 'Takumi RX-T': 'octane', Triton: 'octane',
  Zippy: 'octane', Fennec: 'octane', Dingo: 'octane', 'Twin Mill III': 'octane',
  // Dominus
  Dominus: 'dominus', 'Jäger 619 RS': 'dominus', 'Chikara GXT': 'dominus',
  'Peregrine TT': 'dominus', Vulcan: 'dominus', Aftershock: 'dominus',
  Esper: 'dominus', Diestro: 'dominus', GT500: 'dominus', Twinzer: 'dominus',
  Delorean: 'dominus', 'Artemis G1-X': 'dominus', 'Tyranno GXT': 'dominus',
  'Harbinger GXT': 'dominus', Nexus: 'dominus',
  // Plank
  Batmobile: 'plank', Mantis: 'plank', 'Centio V17': 'plank',
  'Maverick GXT': 'plank', Nimbus: 'plank', 'Ronin GXT': 'plank',
  // Breakout
  Breakout: 'breakout', 'Animus GP': 'breakout', Cyclone: 'breakout',
  'Imperator DT5': 'breakout', Werewolf: 'breakout', 'Road Hog': 'breakout',
  'Road Hog XL': 'breakout', Endo: 'breakout', 'Octane ZSR': 'breakout',
  'Breakout Type-S': 'breakout', Boneshaker: 'breakout',
  // Hybrid
  Merc: 'hybrid', 'Mudcat GXT': 'hybrid', Hotshot: 'hybrid',
  Paladin: 'hybrid', 'X-Devil': 'hybrid', Venom: 'hybrid',
  'Growler GXT': 'hybrid', 'Nexus SC': 'hybrid',
}

interface CarProfile {
  body: string; hood: string; bump: string
  fWind: string; roof: string; rWind: string; rBump: string
  wheels: number[][]; wheelW: number; wheelH: number
  exhausts: number[][]
  flames: number[][]
  glow: [number, number, number]
  decal: string
  hitboxLabel: string
  highlights: number[][]
}

const CAR_PROFILES: Record<HitboxType, CarProfile> = {
  octane: {
    body:  'M34,14 L66,14 L76,22 L78,108 Q50,123 22,108 L24,22 Z',
    hood:  'M38,8 L62,8 L66,14 L34,14 Z',
    bump:  'M41,5 L59,5 L62,8 L38,8 Z',
    fWind: 'M37,22 L63,22 L61,46 L39,46 Z',
    roof:  'M39,46 L61,46 L61,96 L39,96 Z',
    rWind: 'M39,96 L61,96 L63,116 L37,116 Z',
    rBump: 'M37,116 L63,116 L65,121 L35,121 Z',
    wheels: [[10,26],[75,26],[10,108],[75,108]],
    wheelW: 15, wheelH: 26,
    exhausts: [[39,121,9,5],[52,121,9,5]],
    flames: [[43.5,133,4,8.5],[56.5,133,4,8.5]],
    glow: [50, 155, 26],
    decal: 'M46,5 L54,5 L57,122 L43,122 Z',
    hitboxLabel: 'Octane',
    highlights: [[24,22,22,108],[76,22,78,108]],
  },
  dominus: {
    body:  'M28,18 L72,18 L83,26 L83,105 Q50,118 17,105 L17,26 Z',
    hood:  'M32,11 L68,11 L72,18 L28,18 Z',
    bump:  'M36,7 L64,7 L68,11 L32,11 Z',
    fWind: 'M30,26 L70,26 L68,48 L32,48 Z',
    roof:  'M32,48 L68,48 L68,96 L32,96 Z',
    rWind: 'M32,96 L68,96 L70,110 L30,110 Z',
    rBump: 'M30,110 L70,110 L72,115 L28,115 Z',
    wheels: [[3,28],[82,28],[3,100],[82,100]],
    wheelW: 14, wheelH: 24,
    exhausts: [[33,115,12,5],[55,115,12,5]],
    flames: [[39,127,5,8],[61,127,5,8]],
    glow: [50, 148, 30],
    decal: 'M45,7 L55,7 L57,113 L43,113 Z',
    hitboxLabel: 'Dominus',
    highlights: [[17,26,17,105],[83,26,83,105]],
  },
  plank: {
    body:  'M24,28 L76,28 L90,36 L90,96 Q50,107 10,96 L10,36 Z',
    hood:  'M28,21 L72,21 L76,28 L24,28 Z',
    bump:  'M32,17 L68,17 L72,21 L28,21 Z',
    fWind: 'M26,36 L74,36 L72,54 L28,54 Z',
    roof:  'M28,54 L72,54 L72,86 L28,86 Z',
    rWind: 'M28,86 L72,86 L74,99 L26,99 Z',
    rBump: 'M26,99 L74,99 L76,104 L24,104 Z',
    wheels: [[-1,36],[87,36],[-1,88],[87,88]],
    wheelW: 13, wheelH: 22,
    exhausts: [[30,104,14,5],[56,104,14,5]],
    flames: [[37,116,5,7],[63,116,5,7]],
    glow: [50, 136, 36],
    decal: 'M45,17 L55,17 L57,102 L43,102 Z',
    hitboxLabel: 'Plank',
    highlights: [[10,36,10,96],[90,36,90,96]],
  },
  breakout: {
    body:  'M34,8 L66,8 L76,16 L78,115 Q50,130 22,115 L24,16 Z',
    hood:  'M38,2 L62,2 L66,8 L34,8 Z',
    bump:  'M42,0 L58,0 L62,2 L38,2 Z',
    fWind: 'M37,16 L63,16 L61,38 L39,38 Z',
    roof:  'M39,38 L61,38 L61,102 L39,102 Z',
    rWind: 'M39,102 L61,102 L63,122 L37,122 Z',
    rBump: 'M37,122 L63,122 L65,127 L35,127 Z',
    wheels: [[10,20],[75,20],[10,110],[75,110]],
    wheelW: 15, wheelH: 26,
    exhausts: [[39,127,9,5],[52,127,9,5]],
    flames: [[43.5,139,4,9],[56.5,139,4,9]],
    glow: [50, 161, 24],
    decal: 'M46,0 L54,0 L57,126 L43,126 Z',
    hitboxLabel: 'Breakout',
    highlights: [[24,16,22,115],[76,16,78,115]],
  },
  hybrid: {
    body:  'M31,16 L69,16 L79,24 L80,106 Q50,120 20,106 L21,24 Z',
    hood:  'M35,9 L65,9 L69,16 L31,16 Z',
    bump:  'M38,6 L62,6 L65,9 L35,9 Z',
    fWind: 'M34,24 L66,24 L64,46 L36,46 Z',
    roof:  'M36,46 L64,46 L64,96 L36,96 Z',
    rWind: 'M36,96 L64,96 L66,112 L34,112 Z',
    rBump: 'M34,112 L66,112 L68,117 L32,117 Z',
    wheels: [[7,24],[78,24],[7,103],[78,103]],
    wheelW: 15, wheelH: 25,
    exhausts: [[37,117,10,5],[53,117,10,5]],
    flames: [[42,129,4,8.5],[58,129,4,8.5]],
    glow: [50, 151, 28],
    decal: 'M46,6 L54,6 L57,116 L43,116 Z',
    hitboxLabel: 'Hybrid',
    highlights: [[21,24,20,106],[79,24,80,106]],
  },
}

function getHitbox(bodyName?: string): HitboxType {
  if (!bodyName) return 'octane'
  return HITBOX_MAP[bodyName] ?? 'octane'
}

// ── Car SVG Preview ──────────────────────────────────────────────────────────

function CarPreview({ build }: { build: Record<string, RLCarSlot> }): React.JSX.Element {
  const g   = (k: string) => build[k] ? getRarityDef(build[k].rarity) : null
  const col = (k: string, def: string) => g(k)?.color ?? def

  const bodyCol  = col('body',   '#1e3a5f')
  const wheelCol = col('wheels', '#4a4a5a')
  const boostCol = col('boost',  '#f97316')
  const decalDef = g('decal')

  const bmBody  = build['body']?.rarity  === 'black_market'
  const bmBoost = build['boost']?.rarity === 'black_market'

  const hitbox = getHitbox(build['body']?.name)
  const p = CAR_PROFILES[hitbox]
  const { wheelW: ww, wheelH: wh } = p

  return (
    <div style={{ position: 'relative', width: 88, height: 140 }}>
      <div className={bmBody ? 'rlg-bm' : ''} style={{ position: 'absolute', inset: 0 }}>
        <svg viewBox="0 0 100 160" width={88} height={140} style={{ overflow: 'visible' }}>
          <defs>
            <radialGradient id="rlg-bg" cx="50%" cy="35%" r="65%">
              <stop offset="0%"   stopColor={bodyCol} stopOpacity="1"   />
              <stop offset="100%" stopColor={bodyCol} stopOpacity="0.7" />
            </radialGradient>
            <linearGradient id="rlg-wf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="rgba(160,225,255,0.55)" />
              <stop offset="100%" stopColor="rgba(80,140,225,0.28)"  />
            </linearGradient>
            <linearGradient id="rlg-wr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="rgba(60,100,200,0.38)" />
              <stop offset="100%" stopColor="rgba(30,50,130,0.18)"  />
            </linearGradient>
            <radialGradient id="rlg-bstg" cx="50%" cy="100%" r="70%">
              <stop offset="0%"   stopColor={bmBoost ? '#ec4899' : boostCol} stopOpacity="0.9" />
              <stop offset="70%"  stopColor={bmBoost ? '#ec4899' : boostCol} stopOpacity="0.4" />
              <stop offset="100%" stopColor={bmBoost ? '#ec4899' : boostCol} stopOpacity="0"   />
            </radialGradient>
          </defs>

          {/* Boost ground glow */}
          <ellipse
            cx={p.glow[0]} cy={p.glow[1]} rx={p.glow[2]} ry="10"
            fill="url(#rlg-bstg)"
            style={{ animation: 'rlg-boost 1.35s ease-in-out infinite', transformOrigin: `${p.glow[0]}px ${p.glow[1]}px` }}
          />

          {/* Wheels — dark outer + colored rim */}
          {p.wheels.map(([x, y], i) => (
            <g key={i}>
              <rect x={x}   y={y}   width={ww}     height={wh}     rx={5} fill="#0e0e0e" />
              <rect x={x+2} y={y+2} width={ww-4}   height={wh-4}   rx={4} fill={wheelCol} />
              <rect x={x+4} y={y+6} width={ww-8}   height={wh-12}  rx={3} fill="rgba(0,0,0,0.4)" />
            </g>
          ))}

          {/* Main body */}
          <path d={p.body} fill="url(#rlg-bg)" />

          {/* Hood */}
          <path d={p.hood} fill={bodyCol} opacity="0.88" />
          {/* Front bumper */}
          <path d={p.bump} fill={bodyCol} opacity="0.58" />

          {/* Decal stripe */}
          {decalDef && <path d={p.decal} fill={decalDef.color} opacity="0.48" />}

          {/* Front windshield */}
          <path d={p.fWind} fill="url(#rlg-wf)" />

          {/* Roof panel */}
          <path d={p.roof} fill={bodyCol} opacity="0.55" />

          {/* Rear windshield */}
          <path d={p.rWind} fill="url(#rlg-wr)" />

          {/* Side highlight edges */}
          {p.highlights.map(([x1, y1, x2, y2], i) => (
            <path key={i} d={`M${x1},${y1} L${x2},${y2}`} stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" fill="none" />
          ))}

          {/* Rear bumper */}
          <path d={p.rBump} fill={bodyCol} opacity="0.62" />

          {/* Exhaust ports */}
          {p.exhausts.map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} rx={2.5} fill="#111" />
          ))}

          {/* Boost flames */}
          {p.flames.map(([cx, cy, rx, ry], i) => (
            <ellipse
              key={i}
              cx={cx} cy={cy} rx={rx} ry={ry}
              fill={bmBoost ? '#ec4899' : boostCol}
              opacity="0.9"
              className={bmBoost ? 'rlg-bm' : ''}
              style={{
                animation: `rlg-boost ${1 + i * 0.1}s ease-in-out infinite`,
                transformOrigin: `${cx}px ${cy - ry}px`,
                animationDelay: i > 0 ? '0.22s' : undefined,
              }}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}

// ── Slot Card ─────────────────────────────────────────────────────────────────

function SlotCard({
  slotDef, item, onClick, onClear,
}: {
  slotDef: typeof CAR_SLOTS[0]
  item?: RLCarSlot
  onClick: () => void
  onClear: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const rDef  = item ? getRarityDef(item.rarity) : null
  const isBM  = item?.rarity === 'black_market'
  const isEx  = item?.rarity === 'exotic'
  const isImp = item?.rarity === 'import'

  return (
    <div
      className={`rlg-slot relative rounded-xl border cursor-pointer
        ${isBM ? 'rlg-bm' : isEx ? 'rlg-exotic' : isImp ? 'rlg-import' : ''}`}
      style={{
        borderColor: rDef ? `${rDef.color}60` : 'var(--color-bg-border)',
        background:  rDef
          ? `linear-gradient(135deg, ${rDef.color}1e, ${rDef.color}0a)`
          : 'var(--color-bg-secondary)',
        boxShadow: rDef && !isBM && !isImp ? `0 0 10px ${rDef.glow}` : undefined,
      }}
      onClick={onClick}
    >
      <div className="p-2.5">
        <div className="flex items-start justify-between mb-1">
          <span className="text-sm leading-none">{slotDef.emoji}</span>
          {item && (
            <button
              onClick={onClear}
              className="p-0.5 rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <X size={10} />
            </button>
          )}
        </div>
        <div className="text-[10px] text-text-muted mb-0.5 leading-none">{slotDef.label}</div>
        {item ? (
          <>
            <div
              className="text-xs font-semibold truncate leading-snug"
              style={{ color: rDef?.color ?? 'var(--color-text-primary)' }}
              title={item.name}
            >
              {item.name}
            </div>
            <div className="text-[9px] mt-0.5 font-medium opacity-75" style={{ color: rDef?.color }}>
              {rDef?.label}
            </div>
          </>
        ) : (
          <div className="text-[10px] text-text-muted italic opacity-50">Vazio</div>
        )}
      </div>
    </div>
  )
}

// ── Preset Card ───────────────────────────────────────────────────────────────

function PresetCard({
  preset, isSelected, onLoad, onDelete,
}: {
  preset: RLCarPreset
  isSelected: boolean
  onLoad: () => void
  onDelete: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const top  = topRarity(preset.slots)
  const rDef = getRarityDef(top)
  const isBM = top === 'black_market'

  return (
    <div
      className={`rlg-preset rounded-xl border cursor-pointer p-3.5 relative select-none ${isBM ? 'rlg-bm' : ''}`}
      style={{
        borderColor: isSelected ? rDef.color : `${rDef.color}55`,
        background: isSelected
          ? `linear-gradient(135deg, ${rDef.color}2a, ${rDef.color}0d)`
          : `linear-gradient(135deg, ${rDef.color}16, ${rDef.color}07)`,
        boxShadow: isSelected
          ? `0 0 24px ${rDef.glow}, 0 4px 16px rgba(0,0,0,0.32)`
          : `0 2px 8px rgba(0,0,0,0.16)`,
      }}
      onClick={onLoad}
    >
      {isSelected && (
        <div
          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: rDef.color, boxShadow: `0 0 10px ${rDef.glow}` }}
        >
          <Check size={11} className="text-white" />
        </div>
      )}

      <div className="font-bold text-text-primary text-sm truncate mb-2.5 pr-7" title={preset.name}>
        {preset.name}
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mb-3">
        {Object.entries(preset.slots).map(([key, item]) => {
          const sd = CAR_SLOTS.find(s => s.key === key)
          const r  = getRarityDef(item.rarity)
          return (
            <div key={key} className="flex items-center gap-1 min-w-0" title={`${sd?.label}: ${item.name}`}>
              <span className="text-[11px] shrink-0">{sd?.emoji ?? '?'}</span>
              <span className="text-[10px] font-semibold truncate" style={{ color: r.color }}>
                {item.name}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${rDef.color}25`, color: rDef.color }}
        >
          {Object.keys(preset.slots).length} itens · {rDef.label}
        </span>
        <button
          onClick={onDelete}
          className="p-1 rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

// ── Slot Modal ────────────────────────────────────────────────────────────────

function SlotModal({
  slotDef, initial, onSave, onClose,
}: {
  slotDef: typeof CAR_SLOTS[0]
  initial: { name: string; rarity: string }
  onSave: (name: string, rarity: string) => void
  onClose: () => void
}): React.JSX.Element {
  const [name,        setName]        = useState(initial.name)
  const [rarity,      setRarity]      = useState(initial.rarity || 'rare')
  const [suggestions, setSuggestions] = useState<RLItemDef[]>([])
  const [showSug,     setShowSug]     = useState(false)
  const [focusedSug,  setFocusedSug]  = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const selRDef = getRarityDef(rarity)

  function handleNameChange(v: string) {
    setName(v)
    const results = searchItems(slotDef.key, v)
    setSuggestions(results)
    setShowSug(results.length > 0 && v.trim().length > 0)
    setFocusedSug(-1)
  }

  function pickSuggestion(item: RLItemDef) {
    setName(item.name)
    setRarity(item.rarity)
    setSuggestions([])
    setShowSug(false)
    setFocusedSug(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (showSug && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedSug(i => Math.min(i + 1, suggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedSug(i => Math.max(i - 1, -1))
        return
      }
      if (e.key === 'Enter' && focusedSug >= 0) {
        e.preventDefault()
        pickSuggestion(suggestions[focusedSug])
        return
      }
      if (e.key === 'Escape') {
        setShowSug(false)
        return
      }
    }
    if (e.key === 'Enter' && name.trim() && focusedSug < 0) {
      onSave(name.trim(), rarity)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-2xl border w-full max-w-sm p-5 space-y-4"
        style={{
          background:   'var(--color-bg-primary, #0f0f0f)',
          borderColor:  `${selRDef.color}55`,
          boxShadow:    `0 24px 64px rgba(0,0,0,0.65), 0 0 32px ${selRDef.glow}`,
          transition:   'border-color 0.25s ease, box-shadow 0.25s ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{slotDef.emoji}</span>
            <span className="font-bold text-text-primary">{slotDef.label}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Name input + autocomplete */}
        <div className="relative">
          <label className="text-xs text-text-muted block mb-1.5">Nome do item</label>
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setShowSug(false), 120)}
            onFocus={() => name.trim() && suggestions.length > 0 && setShowSug(true)}
            placeholder="Ex: Fennec, Dueling Dragons..."
            className="w-full px-3 py-2.5 rounded-lg text-sm text-text-primary bg-bg-secondary border border-bg-border focus:outline-none transition-colors placeholder:text-text-muted"
            style={{ borderColor: showSug ? `${selRDef.color}80` : undefined } as React.CSSProperties}
          />
          {showSug && suggestions.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full mt-1 rounded-xl border overflow-hidden z-10"
              style={{
                background:  'var(--color-bg-primary, #0f0f0f)',
                borderColor: `${selRDef.color}40`,
                boxShadow:   `0 8px 24px rgba(0,0,0,0.5), 0 0 12px ${selRDef.glow}`,
              }}
            >
              {suggestions.map((item, idx) => {
                const r = getRarityDef(item.rarity)
                return (
                  <button
                    key={item.name}
                    onMouseDown={() => pickSuggestion(item)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors"
                    style={{
                      background: idx === focusedSug ? `${selRDef.color}18` : 'transparent',
                      borderBottom: idx < suggestions.length - 1 ? '1px solid var(--color-bg-border)' : undefined,
                    }}
                  >
                    <span className="flex-1 text-text-primary font-medium">{item.name}</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: `${r.color}22`, color: r.color }}
                    >
                      {r.label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Rarity picker */}
        <div>
          <label className="text-xs text-text-muted block mb-2">Raridade</label>
          <div className="grid grid-cols-4 gap-1.5">
            {RARITIES.slice(0, 4).map(r => (
              <button
                key={r.key}
                onClick={() => setRarity(r.key)}
                className={`rlg-rbtn rounded-lg py-1.5 text-[10px] font-bold text-center ${rarity === r.key ? 'sel' : ''}`}
                style={{
                  borderWidth: 1, borderStyle: 'solid',
                  borderColor: rarity === r.key ? r.color : `${r.color}44`,
                  background:  rarity === r.key ? `${r.color}2a` : 'var(--color-bg-secondary)',
                  color:       r.color,
                  boxShadow:   rarity === r.key ? `0 0 10px ${r.glow}` : undefined,
                }}
              >
                {r.label}
              </button>
            ))}
            {RARITIES.slice(4, 6).map(r => (
              <button
                key={r.key}
                onClick={() => setRarity(r.key)}
                className={`rlg-rbtn rounded-lg py-1.5 text-[10px] font-bold text-center ${rarity === r.key ? 'sel' : ''}`}
                style={{
                  borderWidth: 1, borderStyle: 'solid',
                  borderColor: rarity === r.key ? r.color : `${r.color}44`,
                  background:  rarity === r.key ? `${r.color}2a` : 'var(--color-bg-secondary)',
                  color:       r.color,
                  boxShadow:   rarity === r.key ? `0 0 10px ${r.glow}` : undefined,
                }}
              >
                {r.label}
              </button>
            ))}
            {/* Black Market — spans 2 cols */}
            <button
              onClick={() => setRarity('black_market')}
              className={`rlg-rbtn col-span-2 rounded-lg py-1.5 text-[10px] font-bold text-center
                ${rarity === 'black_market' ? 'sel rlg-bm' : ''}`}
              style={{
                borderWidth: 1, borderStyle: 'solid',
                borderColor: rarity === 'black_market' ? '#ec4899' : '#ec489944',
                background:  rarity === 'black_market' ? '#ec489928' : 'var(--color-bg-secondary)',
                color:       '#ec4899',
                boxShadow:   rarity === 'black_market' ? '0 0 14px rgba(236,72,153,0.55)' : undefined,
              }}
            >
              ✨ Black Market
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-bg-border text-text-muted text-sm hover:bg-bg-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => name.trim() && onSave(name.trim(), rarity)}
            disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-all hover:brightness-110 active:scale-95"
            style={{
              background:  'linear-gradient(135deg, #f97316, #ea580c)',
              boxShadow:   '0 2px 12px rgba(249,115,22,0.38)',
            }}
          >
            Equipar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Garage Component ─────────────────────────────────────────────────────

interface RLGarageProps {
  onPresetsChange?: (presets: RLCarPreset[]) => void
}

export default function RLGarage({ onPresetsChange }: RLGarageProps): React.JSX.Element {
  const [presets,       setPresets]       = useState<RLCarPreset[]>([])
  const [currentBuild,  setCurrentBuild]  = useState<Record<string, RLCarSlot>>({})
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [editingSlot,   setEditingSlot]   = useState<string | null>(null)
  const [slotInitial,   setSlotInitial]   = useState({ name: '', rarity: 'rare' })
  const [presetName,    setPresetName]    = useState('')
  const [showPresetForm, setShowPresetForm] = useState(false)
  const [saving,        setSaving]        = useState(false)

  const hasApi = !!(window as { electronApi?: { rocketLeague?: unknown } }).electronApi?.rocketLeague

  useEffect(() => { loadPresets() }, [])

  async function loadPresets() {
    if (!hasApi) return
    const raw = await window.api!.rocketLeague!.listPresets() as Array<{
      id: number; name: string; slots: string; created_at: string
    }>
    const parsed: RLCarPreset[] = raw.map(p => ({
      ...p,
      slots: (() => { try { return JSON.parse(p.slots) as Record<string, RLCarSlot> } catch { return {} } })(),
    }))
    setPresets(parsed)
    onPresetsChange?.(parsed)
  }

  function openSlot(key: string) {
    const ex = currentBuild[key]
    setSlotInitial({ name: ex?.name ?? '', rarity: ex?.rarity ?? 'rare' })
    setEditingSlot(key)
  }

  function saveSlot(name: string, rarity: string) {
    if (!editingSlot) return
    setCurrentBuild(prev => ({ ...prev, [editingSlot]: { name, rarity } }))
    setSelectedPreset(null)
    setEditingSlot(null)
  }

  function clearSlot(key: string, e: React.MouseEvent) {
    e.stopPropagation()
    setCurrentBuild(prev => { const n = { ...prev }; delete n[key]; return n })
    setSelectedPreset(null)
  }

  async function handleSavePreset() {
    if (!presetName.trim() || !hasApi) return
    setSaving(true)
    await window.api!.rocketLeague!.savePreset({
      name: presetName.trim(),
      slots: JSON.stringify(currentBuild),
    })
    setSaving(false)
    setPresetName('')
    setShowPresetForm(false)
    loadPresets()
  }

  function loadPresetIntoBuilder(preset: RLCarPreset) {
    setCurrentBuild(preset.slots)
    setSelectedPreset(preset.id)
  }

  async function handleDeletePreset(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!hasApi) return
    await window.api!.rocketLeague!.deletePreset(id)
    if (selectedPreset === id) { setSelectedPreset(null); setCurrentBuild({}) }
    loadPresets()
  }

  const editingSlotDef = CAR_SLOTS.find(s => s.key === editingSlot)
  const hasBuild       = Object.keys(currentBuild).length > 0

  // Dynamic border color based on highest rarity in current build
  const buildTopRar   = hasBuild ? topRarity(currentBuild) : null
  const buildRarDef   = buildTopRar ? getRarityDef(buildTopRar) : null

  return (
    <>
      <style>{GARAGE_STYLES}</style>
      <div className="space-y-5 rlg-enter">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
            style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(249,115,22,0.07))' }}
          >
            🚗
          </div>
          <div>
            <h2 className="font-bold text-text-primary">Garagem</h2>
            <p className="text-xs text-text-muted">Monte seu carro e salve presets</p>
          </div>
        </div>

        {/* ── Car Builder ─────────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            borderColor: buildRarDef ? `${buildRarDef.color}55` : 'var(--color-bg-border)',
            background:  buildRarDef
              ? `linear-gradient(135deg, ${buildRarDef.color}0d, rgba(249,115,22,0.03))`
              : 'linear-gradient(135deg, rgba(249,115,22,0.07), rgba(249,115,22,0.02))',
            transition:  'border-color 0.4s ease, background 0.4s ease',
          }}
        >
          <div className="flex flex-col sm:flex-row">
            {/* Car Preview panel */}
            <div
              className="flex flex-col items-center justify-center py-8 px-10 sm:border-r border-b sm:border-b-0 border-bg-border shrink-0"
              style={{ background: 'rgba(0,0,0,0.15)' }}
            >
              <CarPreview build={currentBuild} />
              {/* Hitbox badge */}
              {currentBuild['body'] && (
                <div className="mt-2 text-center">
                  <span className="text-[10px] text-text-muted">Hitbox: </span>
                  <span className="text-[10px] font-bold" style={{ color: '#f97316' }}>
                    {CAR_PROFILES[getHitbox(currentBuild['body']?.name)].hitboxLabel}
                  </span>
                </div>
              )}
              {selectedPreset !== null && (
                <div className="mt-3 text-center">
                  <div className="text-[10px] text-text-muted">Preset ativo</div>
                  <div className="text-xs font-semibold mt-0.5" style={{ color: '#f97316' }}>
                    {presets.find(p => p.id === selectedPreset)?.name ?? ''}
                  </div>
                </div>
              )}
              {!hasBuild && (
                <div className="mt-4 text-center">
                  <div className="text-[11px] text-text-muted opacity-60">Clique nos slots →</div>
                </div>
              )}
            </div>

            {/* Slots panel */}
            <div className="flex-1 p-4 sm:p-5">
              <div className="text-[10px] text-text-muted mb-3 font-semibold uppercase tracking-widest">
                Personalização
              </div>
              <div className="grid grid-cols-4 gap-2">
                {CAR_SLOTS.map(slot => (
                  <SlotCard
                    key={slot.key}
                    slotDef={slot}
                    item={currentBuild[slot.key]}
                    onClick={() => openSlot(slot.key)}
                    onClear={e => clearSlot(slot.key, e)}
                  />
                ))}
              </div>

              {/* Save as preset */}
              <div className="mt-4 pt-4 border-t border-bg-border">
                {showPresetForm ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={presetName}
                      onChange={e => setPresetName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
                      placeholder="Nome do preset..."
                      className="flex-1 px-3 py-2 rounded-lg text-sm text-text-primary bg-bg-primary border border-bg-border focus:outline-none focus:border-orange-400 transition-colors placeholder:text-text-muted"
                    />
                    <button
                      onClick={handleSavePreset}
                      disabled={!presetName.trim() || saving}
                      className="p-2 rounded-lg text-white disabled:opacity-40 transition-all hover:brightness-110 active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                    >
                      {saving
                        ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        : <Check size={16} />}
                    </button>
                    <button
                      onClick={() => { setShowPresetForm(false); setPresetName('') }}
                      className="p-2 rounded-lg border border-bg-border text-text-muted hover:bg-bg-secondary transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPresetForm(true)}
                    disabled={!hasBuild}
                    className="flex items-center gap-1.5 text-sm font-medium transition-all hover:brightness-110 disabled:opacity-30"
                    style={{ color: '#f97316' }}
                  >
                    <Plus size={14} />
                    Salvar como preset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Saved Presets ───────────────────────────────────────────────────── */}
        {presets.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} style={{ color: '#f97316' }} />
              <h3 className="font-semibold text-text-primary text-sm">Presets Salvos</h3>
              <span className="text-xs text-text-muted">{presets.length} preset{presets.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {presets.map(preset => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isSelected={selectedPreset === preset.id}
                  onLoad={() => loadPresetIntoBuilder(preset)}
                  onDelete={e => handleDeletePreset(preset.id, e)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-bg-border bg-bg-secondary text-center py-10">
            <div className="text-4xl mb-3">🚗</div>
            <div className="text-sm font-medium text-text-secondary">Nenhum preset salvo ainda</div>
            <div className="text-xs text-text-muted mt-1 opacity-60">
              Monte seu carro acima e salve como preset
            </div>
          </div>
        )}
      </div>

      {/* ── Slot Modal ──────────────────────────────────────────────────────── */}
      {editingSlot !== null && editingSlotDef && (
        <SlotModal
          slotDef={editingSlotDef}
          initial={slotInitial}
          onSave={saveSlot}
          onClose={() => setEditingSlot(null)}
        />
      )}
    </>
  )
}
