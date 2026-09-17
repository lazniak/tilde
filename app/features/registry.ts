// Feature registry. Each feature package (app/features/<name>/index.tsx) exports a
// FeatureSlots object; the core screens render every registered component in the
// matching slot. Packages own their own directory, API routes (app/api/<name>/…)
// and i18n files (app/features/<name>/i18n/<lang>.json, namespace = <name>).
//
// Core never imports from a feature package except through this file.

import type { ComponentType } from 'react'
import curator from './curator'
import guide from './guide'
import community from './community'
import archaeology from './archaeology'

export interface FeatureSlots {
  /** Landing screen, below the ENTER button. */
  landingExtras?: ComponentType[]
  /** Hub, below the three panel cards (above the offering block). */
  hubExtras?: ComponentType[]
  /** Genesis, after the interactive prompt block. */
  genesisExtras?: ComponentType[]
  /** Incarnation, below the clip timeline strip. */
  incarnationExtras?: ComponentType[]
  /** Exegesis, between the intro block and the message list. */
  exegesisExtras?: ComponentType[]
  /** Exegesis, right above the input form (e.g. voice ritual button). */
  exegesisInputExtras?: ComponentType[]
  /** Always mounted once the visitor has entered (global overlays, players, shaders). */
  overlays?: ComponentType[]
  /** Small extra buttons rendered in the bottom navigation bar. */
  navExtras?: ComponentType[]
  /** Optional background replacement (e.g. WebGL shader). First non-null wins. */
  background?: ComponentType
}

export const FEATURES: FeatureSlots[] = [curator, guide, community, archaeology]

export type SlotName = Exclude<keyof FeatureSlots, 'background'>

export function slotComponents(name: SlotName): ComponentType[] {
  return FEATURES.flatMap(f => (f[name] as ComponentType[] | undefined) ?? [])
}

export function backgroundComponent(): ComponentType | null {
  for (const f of FEATURES) if (f.background) return f.background
  return null
}
