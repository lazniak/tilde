// Feature package "curator". See app/features/registry.ts for the slot contract.
//
//  - ConfessPrompt   (exegesisExtras)      the visitor's own abstract prompt, analysed
//  - VoiceRitual     (exegesisInputExtras) hold-to-speak, spoken answer
//  - AttractorTally  (hubExtras, incarnationExtras) one quiet line of evidence
//  - NoiseReveal     no slot: a component core Exegesis may use for the streaming
//                    bubble. See CORE_REQUESTS.md.

import type { FeatureSlots } from '../registry'
import { AttractorTally } from './AttractorTally'
import { ConfessPrompt } from './ConfessPrompt'
import { NoiseReveal } from './NoiseReveal'
import { VoiceRitual } from './VoiceRitual'

const slots: FeatureSlots = {
  exegesisExtras: [ConfessPrompt],
  exegesisInputExtras: [VoiceRitual],
  hubExtras: [AttractorTally],
  incarnationExtras: [AttractorTally],
}

export { AttractorTally, ConfessPrompt, NoiseReveal, VoiceRitual }

export default slots
