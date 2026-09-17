'use client'

import { getAudioEngine } from '@/app/lib/audioEngine'

/**
 * A single WebGL2 full-screen field, shared by every mount of <ShaderBackground />.
 *
 * The core renders the background inside each screen, and the screens are swapped
 * through <AnimatePresence mode="wait">, so the background component unmounts and
 * remounts on every navigation. Re-creating a GL context on every step of the
 * auto-tour would be wasteful (browsers also cap the number of live contexts), so the
 * context lives here: `acquireField` moves the one canvas into the new host and
 * `releaseField` detaches it, tearing the context down for real once nothing has
 * claimed it for GRACE_MS.
 *
 * Nothing outside this module touches GL objects.
 */

const GRACE_MS = 4000

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

// Value noise with a sin-free hash (cheaper on mobile GPUs); 3 + 2 octaves only.
// Palette: void #050505 base, stratosphere #1C3F94, flare #D96C2C, prismatic #E0FFFF.
const FRAG = `#version 300 es
precision mediump float;

uniform vec2 uRes;
uniform float uTime;
uniform float uBass;
uniform float uMid;

out vec4 fragColor;

vec2 hash2(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy) * 2.0 - 1.0;
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = dot(hash2(i), f);
  float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm3(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}

float fbm2(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 2; i++) { v += a * vnoise(p); p = p * 2.07 + 5.3; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / max(uRes.x, 1.0);
  float t = uTime * (0.040 + uBass * 0.045);

  float f1 = fbm3(uv * 2.1 + vec2(t, -t * 0.55));
  float f2 = fbm2(uv * 3.1 - vec2(t * 0.7, t * 0.30) + 4.2);

  vec3 base   = vec3(0.0196, 0.0196, 0.0196);
  vec3 strato = vec3(0.110, 0.247, 0.580);
  vec3 flare  = vec3(0.851, 0.424, 0.173);
  vec3 prism  = vec3(0.878, 1.000, 1.000);

  float s  = smoothstep(-0.18, 0.52, f1) * (0.55 + uMid * 0.30);
  float fl = smoothstep(0.06, 0.62, f2) * (0.30 + uBass * 0.35);
  float pr = pow(max(0.0, f1 * f2 + 0.12), 3.0) * 0.45;

  vec3 col = base + strato * s + flare * fl + prism * pr;

  float r = length(uv);
  col *= 1.0 - 0.5 * smoothstep(0.32, 0.95, r);

  fragColor = vec4(col, 1.0);
}`

export interface FieldOptions {
  /** Render at half resolution (phones). */
  halfRes: boolean
  /** Called if the GL context is lost — the caller should fall back to the plain image. */
  onLost?: () => void
}

let canvas: HTMLCanvasElement | null = null
let gl: WebGL2RenderingContext | null = null
let program: WebGLProgram | null = null
let vao: WebGLVertexArrayObject | null = null
let uRes: WebGLUniformLocation | null = null
let uTime: WebGLUniformLocation | null = null
let uBass: WebGLUniformLocation | null = null
let uMid: WebGLUniformLocation | null = null

let owner: HTMLElement | null = null
let onLostCb: (() => void) | null = null
let halfRes = false
let supported: boolean | null = null

let raf = 0
let disposeTimer = 0
let visibilityHooked = false

let elapsed = 0
let lastTs = 0
let lastFrame = 0
let lastW = 0
let lastH = 0

let analyser: AnalyserNode | null = null
// Typed off the constructor so this compiles on both the pre- and post-TS-5.7
// TypedArray signatures (Uint8Array<ArrayBuffer> vs Uint8Array).
const makeFreqBuffer = (n: number) => new Uint8Array(n)
let freq: ReturnType<typeof makeFreqBuffer> | null = null
let bass = 0
let mid = 0

function compile(g: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = g.createShader(type)
  if (!sh) return null
  g.shaderSource(sh, src)
  g.compileShader(sh)
  if (!g.getShaderParameter(sh, g.COMPILE_STATUS)) {
    console.warn('[guide] shader compile failed:', g.getShaderInfoLog(sh))
    g.deleteShader(sh)
    return null
  }
  return sh
}

function onContextLost(e: Event) {
  e.preventDefault()
  stopLoop()
  supported = false
  gl = null
  program = null
  vao = null
  if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas)
  canvas = null
  const cb = onLostCb
  onLostCb = null
  try {
    cb?.()
  } catch {
    /* ignore */
  }
}

function createField(): boolean {
  if (gl && canvas && program) return true
  if (supported === false) return false
  if (typeof window === 'undefined' || typeof document === 'undefined') return false

  const cv = document.createElement('canvas')
  cv.setAttribute('aria-hidden', 'true')
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'

  let ctx: WebGL2RenderingContext | null = null
  try {
    ctx = cv.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
    }) as WebGL2RenderingContext | null
  } catch {
    ctx = null
  }
  if (!ctx) {
    supported = false
    return false
  }

  const vs = compile(ctx, ctx.VERTEX_SHADER, VERT)
  const fs = compile(ctx, ctx.FRAGMENT_SHADER, FRAG)
  const prog = vs && fs ? ctx.createProgram() : null
  if (!vs || !fs || !prog) {
    supported = false
    return false
  }
  ctx.attachShader(prog, vs)
  ctx.attachShader(prog, fs)
  ctx.linkProgram(prog)
  ctx.deleteShader(vs)
  ctx.deleteShader(fs)
  if (!ctx.getProgramParameter(prog, ctx.LINK_STATUS)) {
    console.warn('[guide] shader link failed:', ctx.getProgramInfoLog(prog))
    ctx.deleteProgram(prog)
    supported = false
    return false
  }

  canvas = cv
  gl = ctx
  program = prog
  vao = ctx.createVertexArray()
  uRes = ctx.getUniformLocation(prog, 'uRes')
  uTime = ctx.getUniformLocation(prog, 'uTime')
  uBass = ctx.getUniformLocation(prog, 'uBass')
  uMid = ctx.getUniformLocation(prog, 'uMid')
  lastW = 0
  lastH = 0
  supported = true
  cv.addEventListener('webglcontextlost', onContextLost, false)
  return true
}

function readAudio() {
  if (!analyser) analyser = getAudioEngine().getAnalyser()
  const a = analyser
  if (!a) {
    // No audio yet (before ENTER) — drift towards a calm baseline and keep animating.
    bass += (0.12 - bass) * 0.02
    mid += (0.10 - mid) * 0.02
    return
  }
  const bins = a.frequencyBinCount
  if (!freq || freq.length !== bins) freq = makeFreqBuffer(bins)
  try {
    a.getByteFrequencyData(freq)
  } catch {
    return
  }

  const loEnd = Math.min(9, bins)
  let lo = 0
  for (let i = 0; i < loEnd; i++) lo += freq[i]
  lo = loEnd > 0 ? lo / (loEnd * 255) : 0

  const hiStart = Math.min(9, bins)
  const hiEnd = Math.min(48, bins)
  let hi = 0
  for (let i = hiStart; i < hiEnd; i++) hi += freq[i]
  hi = hiEnd > hiStart ? hi / ((hiEnd - hiStart) * 255) : 0

  // Heavy smoothing: the field should breathe, never strobe.
  bass += (lo - bass) * 0.08
  mid += (hi - mid) * 0.08
}

function loop(now: number) {
  raf = 0
  if (!gl || !canvas || !program) return
  if (typeof document !== 'undefined' && document.hidden) {
    lastTs = 0
    return // visibilitychange restarts us
  }

  const minFrame = halfRes ? 32 : 16
  if (lastFrame && now - lastFrame < minFrame - 1) {
    raf = window.requestAnimationFrame(loop)
    return
  }
  lastFrame = now

  const dt = lastTs ? Math.min(0.1, (now - lastTs) / 1000) : 0.016
  lastTs = now
  elapsed += dt

  const scale = halfRes ? 0.5 : 1
  const cw = canvas.clientWidth || window.innerWidth || 1
  const ch = canvas.clientHeight || window.innerHeight || 1
  const w = Math.max(1, Math.round(cw * scale))
  const h = Math.max(1, Math.round(ch * scale))
  if (w !== lastW || h !== lastH) {
    canvas.width = w
    canvas.height = h
    lastW = w
    lastH = h
    gl.viewport(0, 0, w, h)
  }

  readAudio()

  gl.useProgram(program)
  if (vao) gl.bindVertexArray(vao)
  if (uRes) gl.uniform2f(uRes, w, h)
  if (uTime) gl.uniform1f(uTime, elapsed)
  if (uBass) gl.uniform1f(uBass, bass)
  if (uMid) gl.uniform1f(uMid, mid)
  gl.drawArrays(gl.TRIANGLES, 0, 3)

  raf = window.requestAnimationFrame(loop)
}

function ensureVisibilityHook() {
  if (visibilityHooked || typeof document === 'undefined') return
  visibilityHooked = true
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && owner) startLoop()
  })
}

function startLoop() {
  if (raf) return
  ensureVisibilityHook()
  if (typeof document !== 'undefined' && document.hidden) return
  lastTs = 0
  lastFrame = 0
  raf = window.requestAnimationFrame(loop)
}

function stopLoop() {
  if (raf) window.cancelAnimationFrame(raf)
  raf = 0
  lastTs = 0
}

function disposeField() {
  stopLoop()
  if (gl) {
    if (program) gl.deleteProgram(program)
    if (vao) gl.deleteVertexArray(vao)
    try {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      /* ignore */
    }
  }
  if (canvas) {
    canvas.removeEventListener('webglcontextlost', onContextLost, false)
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
  }
  canvas = null
  gl = null
  program = null
  vao = null
  uRes = null
  uTime = null
  uBass = null
  uMid = null
  analyser = null
  freq = null
  lastW = 0
  lastH = 0
}

/** Move the shared canvas into `host` and start rendering. False → WebGL2 unavailable. */
export function acquireField(host: HTMLElement, opts: FieldOptions): boolean {
  if (disposeTimer) {
    window.clearTimeout(disposeTimer)
    disposeTimer = 0
  }
  halfRes = opts.halfRes
  onLostCb = opts.onLost ?? null
  if (!createField() || !canvas) return false
  owner = host
  if (canvas.parentNode !== host) host.appendChild(canvas)
  lastW = 0
  lastH = 0
  startLoop()
  return true
}

/** Detach from `host`. The context itself is torn down if nothing re-claims it. */
export function releaseField(host: HTMLElement): void {
  if (owner !== host) return
  owner = null
  onLostCb = null
  stopLoop()
  if (canvas && canvas.parentNode === host) host.removeChild(canvas)
  if (disposeTimer) window.clearTimeout(disposeTimer)
  disposeTimer = window.setTimeout(() => {
    disposeTimer = 0
    if (!owner) disposeField()
  }, GRACE_MS)
}
