'use client'

import { AnimatePresence } from 'framer-motion'
import { I18nProvider } from '@/app/lib/i18n/I18nProvider'
import { LiturgyProvider, useLiturgy } from '@/app/lib/LiturgyContext'
import { Landing } from './screens/Landing'
import { Hub } from './screens/Hub'
import { Genesis } from './screens/Genesis'
import { Incarnation } from './screens/Incarnation'
import { Exegesis } from './screens/Exegesis'
import { BottomNav } from './BottomNav'
import { Narrator } from './Narrator'
import { Slot } from './Slot'

function Screens() {
  const { screen, entered } = useLiturgy()
  return (
    <main className="min-h-[100dvh] bg-void text-bone overflow-x-hidden relative">
      <AnimatePresence mode="wait">
        {screen === 'landing' && <Landing key="landing" />}
        {screen === 'explore' && <Hub key="explore" />}
        {screen === 'genesis' && <Genesis key="genesis" />}
        {screen === 'incarnation' && <Incarnation key="incarnation" />}
        {screen === 'exegesis' && <Exegesis key="exegesis" />}
      </AnimatePresence>

      {entered && screen !== 'landing' && (
        <>
          <BottomNav />
          <Narrator />
          <Slot name="overlays" />
        </>
      )}
    </main>
  )
}

export default function LiturgyApp() {
  return (
    <I18nProvider>
      <LiturgyProvider>
        <Screens />
      </LiturgyProvider>
    </I18nProvider>
  )
}
