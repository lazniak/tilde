// Feature package "community" — the wall of testimonies and the co-signature register.
// Extra routes owned by this package: /press, /embed, /c/[id], /api/community/*.
import type { FeatureSlots } from '../registry'
import { TestimonyWall } from './TestimonyWall'
import { CoSign } from './CoSign'

const slots: FeatureSlots = {
  hubExtras: [TestimonyWall, CoSign],
}

export default slots
