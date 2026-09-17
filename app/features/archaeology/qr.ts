/**
 * Minimal QR Code encoder — byte mode, error correction level M, versions 1…6.
 * No dependency: Galois-field arithmetic, Reed–Solomon, matrix placement and
 * mask selection are all implemented here. Enough for a ~106-byte URL, which is
 * all the kiosk panel ever needs.
 *
 * Reference: ISO/IEC 18004. Coordinates follow the usual convention of the spec
 * tables (x = column, y = row).
 */

type VersionTable = Record<number, number>

/** Error-correction codewords per block, level M. */
const EC_PER_BLOCK: VersionTable = { 1: 10, 2: 16, 3: 26, 4: 18, 5: 24, 6: 16 }
/** Number of (equally sized) blocks, level M. */
const BLOCKS: VersionTable = { 1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 4 }
/** Total data codewords, level M. */
const DATA_CODEWORDS: VersionTable = { 1: 16, 2: 28, 3: 44, 4: 64, 5: 86, 6: 108 }
/** Byte-mode payload capacity, level M. */
const BYTE_CAPACITY: VersionTable = { 1: 14, 2: 26, 3: 42, 4: 62, 5: 84, 6: 106 }
/** Single alignment-pattern centre (versions 2…6 have exactly one usable one). */
const ALIGN_CENTRE: VersionTable = { 2: 18, 3: 22, 4: 26, 5: 30, 6: 34 }

export const QR_MAX_BYTES = BYTE_CAPACITY[6]

// ---------------------------------------------------------------------------
// GF(256) arithmetic, primitive polynomial 0x11D
// ---------------------------------------------------------------------------

const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)

;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
})()

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return EXP[LOG[a] + LOG[b]]
}

/** Generator polynomial of the given degree, coefficients high-order first. */
function generatorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1])
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], EXP[i])
    }
    poly = next
  }
  return poly
}

function reedSolomon(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = generatorPoly(ecLen)
  const remainder = new Uint8Array(ecLen)
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0]
    remainder.copyWithin(0, 1)
    remainder[ecLen - 1] = 0
    for (let j = 0; j < ecLen; j++) remainder[j] ^= gfMul(gen[j + 1], factor)
  }
  return remainder
}

// ---------------------------------------------------------------------------
// Bit stream
// ---------------------------------------------------------------------------

class BitBuffer {
  bits: number[] = []
  push(value: number, length: number) {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1)
  }
}

function utf8Bytes(text: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text)
  const out: number[] = []
  for (const ch of Array.from(text)) {
    const cp = ch.codePointAt(0) ?? 0
    if (cp < 0x80) out.push(cp)
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f))
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f))
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f))
  }
  return new Uint8Array(out)
}

function pickVersion(byteLength: number): number {
  for (let v = 1; v <= 6; v++) if (byteLength <= BYTE_CAPACITY[v]) return v
  return 0
}

function buildCodewords(bytes: Uint8Array, version: number): Uint8Array {
  const totalData = DATA_CODEWORDS[version]
  const buf = new BitBuffer()
  buf.push(0b0100, 4) // byte mode
  buf.push(bytes.length, 8) // versions 1…9 use an 8-bit character count in byte mode
  for (let i = 0; i < bytes.length; i++) buf.push(bytes[i], 8)

  const capacityBits = totalData * 8
  buf.push(0, Math.min(4, capacityBits - buf.bits.length))
  while (buf.bits.length % 8 !== 0) buf.bits.push(0)

  const data = new Uint8Array(totalData)
  for (let i = 0; i < buf.bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) byte = (byte << 1) | buf.bits[i + j]
    data[i / 8] = byte
  }
  const pad = [0xec, 0x11]
  for (let i = buf.bits.length / 8, k = 0; i < totalData; i++, k++) data[i] = pad[k % 2]

  // Split into equally sized blocks, compute EC, interleave.
  const blockCount = BLOCKS[version]
  const ecLen = EC_PER_BLOCK[version]
  const perBlock = totalData / blockCount
  const dataBlocks: Uint8Array[] = []
  const ecBlocks: Uint8Array[] = []
  for (let b = 0; b < blockCount; b++) {
    const slice = data.subarray(b * perBlock, (b + 1) * perBlock)
    dataBlocks.push(slice)
    ecBlocks.push(reedSolomon(slice, ecLen))
  }

  const out = new Uint8Array(totalData + ecLen * blockCount)
  let p = 0
  for (let i = 0; i < perBlock; i++) for (const blk of dataBlocks) out[p++] = blk[i]
  for (let i = 0; i < ecLen; i++) for (const blk of ecBlocks) out[p++] = blk[i]
  return out
}

// ---------------------------------------------------------------------------
// Matrix
// ---------------------------------------------------------------------------

export interface QrMatrix {
  size: number
  /** Row-major, 1 = dark. */
  modules: Uint8Array
}

function drawFunctionPatterns(size: number, version: number, modules: Uint8Array, fixed: Uint8Array) {
  const set = (x: number, y: number, dark: number) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    modules[y * size + x] = dark
    fixed[y * size + x] = 1
  }

  // Three finder patterns with their separators.
  const finder = (ox: number, oy: number) => {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const inner = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6
        const ring = inner && (dx === 0 || dx === 6 || dy === 0 || dy === 6)
        const core = inner && dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4
        set(ox + dx, oy + dy, ring || core ? 1 : 0)
      }
    }
  }
  finder(0, 0)
  finder(size - 7, 0)
  finder(0, size - 7)

  // Timing patterns.
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0 ? 1 : 0
    set(i, 6, dark)
    set(6, i, dark)
  }

  // Single alignment pattern (versions 2…6).
  const centre = ALIGN_CENTRE[version]
  if (centre !== undefined) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        set(centre + dx, centre + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1 ? 1 : 0)
      }
    }
  }

  // Reserve the format-information strips (values are written after masking).
  // Index 6 is skipped: those two modules belong to the timing patterns.
  for (let i = 0; i <= 8; i++) {
    if (i === 6) continue
    set(8, i, 0)
    set(i, 8, 0)
  }
  for (let i = 0; i < 8; i++) {
    set(size - 1 - i, 8, 0)
    set(8, size - 1 - i, 0)
  }
  set(8, size - 8, 1) // always dark
}

function drawFormatBits(size: number, modules: Uint8Array, mask: number) {
  const data = (0 << 3) | mask // EC level M => 0b00
  let rem = data
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
  const bits = ((data << 10) | rem) ^ 0x5412
  const bit = (i: number) => (bits >>> i) & 1
  const put = (x: number, y: number, v: number) => {
    modules[y * size + x] = v
  }

  for (let i = 0; i <= 5; i++) put(8, i, bit(i))
  put(8, 7, bit(6))
  put(8, 8, bit(7))
  put(7, 8, bit(8))
  for (let i = 9; i < 15; i++) put(14 - i, 8, bit(i))

  for (let i = 0; i < 8; i++) put(size - 1 - i, 8, bit(i))
  for (let i = 8; i < 15; i++) put(8, size - 15 + i, bit(i))
  put(8, size - 8, 1)
}

function drawCodewords(size: number, modules: Uint8Array, fixed: Uint8Array, codewords: Uint8Array) {
  let i = 0
  const total = codewords.length * 8
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const upward = ((right + 1) & 2) === 0
        const y = upward ? size - 1 - vert : vert
        if (!fixed[y * size + x] && i < total) {
          modules[y * size + x] = (codewords[i >>> 3] >>> (7 - (i & 7))) & 1
          i++
        }
      }
    }
  }
}

function maskBit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0
    case 1:
      return y % 2 === 0
    case 2:
      return x % 3 === 0
    case 3:
      return (x + y) % 3 === 0
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
  }
}

const FINDER_RUN = [1, 0, 1, 1, 1, 0, 1]

function penalty(size: number, modules: Uint8Array): number {
  let score = 0

  // Rule 1 — runs of five or more identical modules.
  for (let dir = 0; dir < 2; dir++) {
    for (let a = 0; a < size; a++) {
      let prev = -1
      let run = 0
      for (let b = 0; b < size; b++) {
        const v = dir === 0 ? modules[a * size + b] : modules[b * size + a]
        if (v === prev) {
          run++
          if (run === 5) score += 3
          else if (run > 5) score += 1
        } else {
          prev = v
          run = 1
        }
      }
    }
  }

  // Rule 2 — 2x2 blocks of one colour.
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const v = modules[y * size + x]
      if (v === modules[y * size + x + 1] && v === modules[(y + 1) * size + x] && v === modules[(y + 1) * size + x + 1]) {
        score += 3
      }
    }
  }

  // Rule 3 — finder-like 1:1:3:1:1 sequences with four light modules beside them.
  const matches = (get: (i: number) => number, at: number, before: boolean) => {
    for (let k = 0; k < 7; k++) if (get(at + k) !== FINDER_RUN[k]) return false
    for (let k = 1; k <= 4; k++) if (get(before ? at - k : at + 6 + k) !== 0) return false
    return true
  }
  for (let dir = 0; dir < 2; dir++) {
    for (let a = 0; a < size; a++) {
      const get = (i: number) => (i < 0 || i >= size ? 0 : dir === 0 ? modules[a * size + i] : modules[i * size + a])
      for (let b = 0; b <= size - 7; b++) if (matches(get, b, true) || matches(get, b, false)) score += 40
    }
  }

  // Rule 4 — deviation from a 50/50 dark ratio.
  let dark = 0
  for (let i = 0; i < modules.length; i++) dark += modules[i]
  const percent = (dark * 100) / modules.length
  score += Math.floor(Math.abs(percent - 50) / 5) * 10
  return score
}

/**
 * Encode `text` as a QR code (byte mode, EC level M, version chosen automatically
 * up to 6). Returns null when the payload does not fit.
 */
export function encodeQr(text: string): QrMatrix | null {
  const bytes = utf8Bytes(text)
  const version = pickVersion(bytes.length)
  if (!version) return null

  const size = 17 + 4 * version
  const codewords = buildCodewords(bytes, version)

  const base = new Uint8Array(size * size)
  const fixed = new Uint8Array(size * size)
  drawFunctionPatterns(size, version, base, fixed)
  drawCodewords(size, base, fixed, codewords)

  let best: Uint8Array | null = null
  let bestScore = Infinity
  for (let mask = 0; mask < 8; mask++) {
    const candidate = Uint8Array.from(base)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!fixed[y * size + x] && maskBit(mask, x, y)) candidate[y * size + x] ^= 1
      }
    }
    drawFormatBits(size, candidate, mask)
    const score = penalty(size, candidate)
    if (score < bestScore) {
      bestScore = score
      best = candidate
    }
  }
  return best ? { size, modules: best } : null
}

/** Build a single SVG path covering every dark module (1 unit = 1 module). */
export function qrPath(matrix: QrMatrix): string {
  const parts: string[] = []
  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (matrix.modules[y * matrix.size + x]) parts.push(`M${x} ${y}h1v1h-1z`)
    }
  }
  return parts.join('')
}
