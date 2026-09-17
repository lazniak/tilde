// Shared caps. Client-safe (no fs, no node built-ins) so the forms and the API agree.

export const TESTIMONY_MAX = 140
export const TESTIMONY_NAME_MAX = 24
export const COSIGN_NAME_MAX = 40
export const COSIGN_CITY_MAX = 40
export const FEED_LIMIT = 100
export const RECENT_SIGNATURES = 12

export interface PublicTestimony {
  id: string
  ts: number
  text: string
  name: string
  lang: string
}
