'use client'

import React from 'react'
import { slotComponents, type SlotName } from '@/app/features/registry'

/** Renders every feature component registered for a slot. */
export function Slot({ name }: { name: SlotName }) {
  const comps = slotComponents(name)
  if (!comps.length) return null
  return (
    <>
      {comps.map((C, i) => (
        <C key={`${name}-${i}`} />
      ))}
    </>
  )
}
