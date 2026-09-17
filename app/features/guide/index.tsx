// Feature package "guide". Fill the slots below; see app/features/registry.ts for the contract.
//
//  navExtras  → TourButton     ▷ TOUR: hands the visit over to the narrator and walks
//                              the triptych by itself until the visitor touches anything.
//  overlays   → TiltMixer      ⟁ TILT (phones only): DeviceOrientation mixes the stems.
//  background → ShaderBackground  audio-reactive WebGL2 field replacing AmbientBackground.
import type { FeatureSlots } from '../registry'
import { TourButton } from './TourButton'
import { TiltMixer } from './TiltMixer'
import { ShaderBackground } from './ShaderBackground'

const slots: FeatureSlots = {
  navExtras: [TourButton],
  overlays: [TiltMixer],
  background: ShaderBackground,
}

export default slots
