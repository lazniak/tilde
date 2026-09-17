// Feature package "archaeology" — forensic instruments for the anomaly.
//
//  · EMERGENCE  (incarnation) — drag the diffusion backwards, noise → face.
//  · LATENT MAP (incarnation) — 65 clips as a constellation of attractor proximity.
//  · ATTENTION ARCHAEOLOGY (genesis) — which words pulled the face out of the weights.
//  · TIMELINE   (genesis)     — the four days, scrubbed, dated by the artefacts themselves.
//  · KIOSK      (nav)         — gallery-wall mode with a self-encoded QR code.
//
// See app/features/registry.ts for the slot contract.
import type { FeatureSlots } from '../registry'
import { EmergenceSlider } from './EmergenceSlider'
import { LatentMap } from './LatentMap'
import { AttentionHeatmap } from './AttentionHeatmap'
import { CreationTimeline } from './CreationTimeline'
import { KioskButton } from './KioskMode'

const slots: FeatureSlots = {
  genesisExtras: [AttentionHeatmap, CreationTimeline],
  incarnationExtras: [EmergenceSlider, LatentMap],
  navExtras: [KioskButton],
}

export default slots
