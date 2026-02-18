import { useEffect, useLayoutEffect, useRef } from 'react'

/* ── props ──────────────────────────────────────────────────── */

interface Props {
  progress: number          // 0–100
  fillColor: string         // e.g. "rgba(18,184,134,0.32)"
  isOverdue?: boolean
  externalWobble?: boolean  // trigger wobble without pointer hover (e.g. during drag)
  resetFill?: boolean       // when true, reset water level to 0 and animate up
  onFillDone?: () => void   // called once the fill-from-zero animation reaches target
}

/* ── constants ──────────────────────────────────────────────── */

const COLS            = 15
const DAMPING         = 0.95   // velocity decay per frame (higher = longer waves)
const TENSION         = 0.04   // spring back to rest (lower = bigger swings)
const SPREAD          = 0.22   // wave propagation to neighbours
const SPREAD_PASS     = 3
const MOUSE_RADIUS    = 5      // columns affected by cursor
const MOUSE_FORCE     = 6      // push strength (was 2.5)
const SETTLE_EPS      = 0.02   // total |dy|+|vy| under which we stop
const MAX_FILL_PCT    = 85     // leave headroom so wave crest is visible at 100%

/* ── component ──────────────────────────────────────────────── */

export function WaterCanvas({ progress, fillColor, isOverdue, externalWobble, resetFill, onFillDone }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const frameRef    = useRef(0)
  const progressRef = useRef(progress)
  const colorRef    = useRef(fillColor)
  const overdueRef  = useRef(isOverdue)
  const wobbleRef   = useRef(externalWobble)
  const resetRef    = useRef(false)
  const fillDoneRef = useRef<(() => void) | undefined>(undefined)
  const kickRef     = useRef<() => void>(() => {})
  progressRef.current = progress
  colorRef.current    = fillColor
  overdueRef.current  = isOverdue
  wobbleRef.current   = externalWobble
  fillDoneRef.current = onFillDone

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const card = canvas.parentElement
    if (!card) return

    let W = 0, H = 0
    let level = progressRef.current
    let fillFromZero = false      // true when doing the fill-from-zero animation
    let fillCalled = false        // prevent double onFillDone call
    let hovered = false
    let running = false          // animation loop active?
    let mouseNX = 0.5            // normalised 0..1
    let mouseNY = 0.5

    // simple spring columns: dy = displacement, vy = velocity
    const dy = new Float64Array(COLS + 1)
    const vy = new Float64Array(COLS + 1)

    /* ── flat fill (no animation) ──── */
    const drawFlat = () => {
      if (!W || !H) return
      const clampedPct = Math.min(progressRef.current, MAX_FILL_PCT)
      const baseY = H * (1 - clampedPct / 100)
      ctx.clearRect(0, 0, W, H)
      if (overdueRef.current) {
        ctx.fillStyle = 'rgba(134,142,150,0.34)'
        ctx.fillRect(0, 0, W, H)
      } else {
        ctx.fillStyle = colorRef.current
        ctx.fillRect(0, baseY, W, H - baseY)
      }
    }

    /* ── sizing ──── */
    const sync = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(devicePixelRatio || 1, 2)
      if (r.width > 0 && r.height > 0 && (r.width !== W || r.height !== H)) {
        W = r.width; H = r.height
        canvas.width  = W * dpr
        canvas.height = H * dpr
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        if (!running) drawFlat()
      }
    }
    const ro = new ResizeObserver(sync)
    ro.observe(card); ro.observe(canvas); sync()

    /* ── physics ──── */
    const simulate = () => {
      // spring each column back to 0
      for (let i = 0; i <= COLS; i++) {
        vy[i] += -dy[i] * TENSION
        vy[i] *= DAMPING
        dy[i] += vy[i]
      }
      // propagate to neighbours
      const lD = new Float64Array(COLS + 1)
      const rD = new Float64Array(COLS + 1)
      for (let p = 0; p < SPREAD_PASS; p++) {
        for (let i = 0; i <= COLS; i++) {
          if (i > 0)    { lD[i] = SPREAD * (dy[i] - dy[i-1]); vy[i-1] += lD[i] }
          if (i < COLS) { rD[i] = SPREAD * (dy[i] - dy[i+1]); vy[i+1] += rD[i] }
        }
        for (let i = 0; i <= COLS; i++) {
          if (i > 0)    dy[i-1] += lD[i]
          if (i < COLS) dy[i+1] += rD[i]
        }
      }
    }

    /* ── mouse push ──── */
    const pushMouse = (baseY: number) => {
      if (!hovered) return
      const col  = Math.round(mouseNX * COLS)
      const surfY = baseY / H              // normalised surface Y
      const delta = mouseNY - surfY        // >0 below surface, <0 above
      const push  = -delta * MOUSE_FORCE   // push surface toward cursor

      for (let i = 0; i <= COLS; i++) {
        const d = Math.abs(i - col)
        if (d <= MOUSE_RADIUS) {
          const f = 1 - d / (MOUSE_RADIUS + 1)
          vy[i] += push * f * 0.3
        }
      }
    }

    /* ── external wobble push (during drag) ──── */
    const pushExternalWobble = () => {
      if (!wobbleRef.current) return
      const t = performance.now() / 350
      for (let i = 0; i <= COLS; i++) {
        const phase = (i / COLS) * Math.PI * 2
        vy[i] += Math.sin(t + phase) * 0.18
      }
    }

    /* ── check energy ──── */
    const settled = (): boolean => {
      let e = 0
      for (let i = 0; i <= COLS; i++) e += Math.abs(dy[i]) + Math.abs(vy[i])
      return e < SETTLE_EPS
    }

    const resetWave = () => {
      dy.fill(0); vy.fill(0)
    }

    /* ── draw wavy surface ──── */
    const drawWave = (offsets: Float64Array, baseY: number, color: string, alpha: number) => {
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.moveTo(0, H)
      for (let i = 0; i <= COLS; i++) {
        const x = (i / COLS) * W
        const y = baseY + offsets[i]
        if (i === 0) { ctx.lineTo(x, y) }
        else {
          const px = ((i-1) / COLS) * W
          const py = baseY + offsets[i-1]
          ctx.quadraticCurveTo(px, py, (px+x)/2, (py+y)/2)
        }
      }
      ctx.lineTo(W, baseY + offsets[COLS])
      ctx.lineTo(W, H)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
      ctx.globalAlpha = 1
    }

    /* ── animation frame ──── */
    const frame = () => {
      if (!W || !H) { sync(); frameRef.current = requestAnimationFrame(frame); return }

      // check if a reset was requested
      if (resetRef.current) {
        resetRef.current = false
        level = 0
        fillFromZero = true
        fillCalled = false
      }

      const targetPct = Math.min(progressRef.current, MAX_FILL_PCT)
      level += (targetPct - level) * 0.06
      const baseY = H * (1 - level / 100)

      // fire onFillDone once the level is close enough to the target
      if (fillFromZero && !fillCalled && Math.abs(level - targetPct) < 0.5) {
        fillCalled = true
        fillFromZero = false
        fillDoneRef.current?.()
      }

      pushMouse(baseY)
      pushExternalWobble()
      simulate()

      ctx.clearRect(0, 0, W, H)
      if (overdueRef.current) {
        ctx.fillStyle = 'rgba(134,142,150,0.34)'
        ctx.fillRect(0, 0, W, H)
      } else {
        drawWave(dy, baseY, colorRef.current, 1)
      }

      // stop loop when mouse gone, no external wobble, fill not animating, and waves flat
      if (!hovered && !wobbleRef.current && !fillFromZero && settled()) {
        resetWave()
        running = false
        drawFlat()
        return
      }
      frameRef.current = requestAnimationFrame(frame)
    }

    const kick = () => {
      if (running) return
      running = true
      frameRef.current = requestAnimationFrame(frame)
    }
    kickRef.current = kick

    /* ── pointer ──── */
    const onEnter = () => { hovered = true;  kick() }
    const onMove  = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      if (!r.width) return
      mouseNX = (e.clientX - r.left) / r.width
      mouseNY = (e.clientY - r.top)  / r.height
      hovered = true
      kick()
    }
    const onLeave = () => { hovered = false }

    card.addEventListener('pointerenter', onEnter)
    card.addEventListener('pointermove',  onMove)
    card.addEventListener('pointerleave', onLeave)

    drawFlat()

    // keep static fill up-to-date when progress changes while idle
    const tid = setInterval(() => { if (!running) drawFlat() }, 300)

    return () => {
      cancelAnimationFrame(frameRef.current)
      clearInterval(tid)
      ro.disconnect()
      card.removeEventListener('pointerenter', onEnter)
      card.removeEventListener('pointermove',  onMove)
      card.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  /* kick animation loop when external wobble activates */
  useEffect(() => {
    if (externalWobble) {
      kickRef.current()
    }
  }, [externalWobble])

  /* reset fill level to 0 and animate from bottom */
  useEffect(() => {
    if (resetFill) {
      resetRef.current = true
      kickRef.current()
    }
  }, [resetFill])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        borderRadius: 'inherit',
      }}
    />
  )
}
