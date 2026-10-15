import { MIME_EXT, type Edit, type ImgFile, type ImgSource, type OutputConfig, type OutputResult, type Tf } from '../types'

/* ============================================================
   基础工具
   ============================================================ */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v
}

export function fmtBytes(n: number | undefined | null): string {
  if (n === null || n === undefined || isNaN(n)) return '—'
  if (n < 1024) return n + ' B'
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1048576).toFixed(2) + ' MB'
}

export function fmtDim(w: number, h: number): string {
  return w + ' × ' + h
}

export function lsGet(k: string): string | null {
  try { return localStorage.getItem(k) } catch { return null }
}
export function lsSet(k: string, v: string): void {
  try { localStorage.setItem(k, v) } catch { /* file:// 等场景可能受限 */ }
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/* ============================================================
   解码与格式探测
   ============================================================ */
export function decodeImage(file: File): Promise<{ source: ImgSource; width: number; height: number; url?: string }> {
  return createImageBitmap(file)
    .then(bmp => ({ source: bmp as ImgSource, width: bmp.width, height: bmp.height }))
    .catch(() => new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight, url })
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')) }
      img.src = url
    }))
}

export async function detectFormat(type: string): Promise<boolean> {
  const probe = makeCanvas(2, 2)
  probe.getContext('2d')!.fillRect(0, 0, 2, 2)
  return new Promise(res => {
    try {
      probe.toBlob(b => res(!!b && b.type === type), type, 0.8)
    } catch { res(false) }
  })
}

/* ============================================================
   变换：旋转 / 翻转 / 裁剪（按文件独立）
   ============================================================ */
export function getRotatedCanvas(file: ImgFile): HTMLCanvasElement | null {
  const t: Tf = file.tf
  const w = file.width, h = file.height
  if (!t.rotate && !t.flipH && !t.flipV) return null
  const swap = t.rotate % 180 !== 0
  const c = makeCanvas(swap ? h : w, swap ? w : h)
  const ctx = c.getContext('2d')!
  ctx.translate(c.width / 2, c.height / 2)
  ctx.rotate((t.rotate * Math.PI) / 180)
  ctx.scale(t.flipH ? -1 : 1, t.flipV ? -1 : 1)
  ctx.drawImage(file.source, -w / 2, -h / 2, w, h)
  return c
}

export function getBaseSize(file: ImgFile): { w: number; h: number } {
  const swap = file.tf.rotate % 180 !== 0
  return swap ? { w: file.height, h: file.width } : { w: file.width, h: file.height }
}

/** 变换 + 裁剪后的画布（预览与导出共用） */
export function getEditedCanvas(file: ImgFile): HTMLCanvasElement {
  const base = getBaseSize(file)
  const c = (file.tf.crop && file.tf.crop.w > 0) ? file.tf.crop : { x: 0, y: 0, w: base.w, h: base.h }
  const x = clamp(Math.round(c.x), 0, Math.max(0, base.w - 1))
  const y = clamp(Math.round(c.y), 0, Math.max(0, base.h - 1))
  const w = clamp(Math.round(c.w), 1, base.w - x)
  const h = clamp(Math.round(c.h), 1, base.h - y)

  const rot = getRotatedCanvas(file)
  const out = makeCanvas(w, h)
  out.getContext('2d')!.drawImage(rot ?? file.source, x, y, w, h, 0, 0, w, h)
  return out
}

/* ============================================================
   滤镜 / 水印 / 锐化
   ============================================================ */
export function filterString(e: Edit): string {
  const parts: string[] = []
  if (e.brightness !== 100) parts.push(`brightness(${e.brightness}%)`)
  if (e.contrast !== 100) parts.push(`contrast(${e.contrast}%)`)
  if (e.saturate !== 100) parts.push(`saturate(${e.saturate}%)`)
  if (e.hue) parts.push(`hue-rotate(${e.hue}deg)`)
  if (e.blur) parts.push(`blur(${e.blur}px)`)
  if (e.grayscale) parts.push(`grayscale(${e.grayscale}%)`)
  if (e.sepia) parts.push(`sepia(${e.sepia}%)`)
  if (e.invert) parts.push(`invert(${e.invert}%)`)
  return parts.length ? parts.join(' ') : 'none'
}

export function drawWatermark(ctx: CanvasRenderingContext2D, W: number, H: number, wm: Edit['wm']): void {
  if (!wm.text) return
  const fs = Math.max(10, W * (wm.size / 100))
  const pad = fs * 0.7
  ctx.save()
  ctx.globalAlpha = wm.opacity / 100
  ctx.font = `700 ${fs.toFixed(1)}px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif`
  ctx.fillStyle = wm.color
  ctx.textBaseline = 'middle'
  let x: number, y: number, align: CanvasTextAlign
  switch (wm.pos) {
    case 'tl': x = pad; y = pad + fs / 2; align = 'left'; break
    case 'tc': x = W / 2; y = pad + fs / 2; align = 'center'; break
    case 'tr': x = W - pad; y = pad + fs / 2; align = 'right'; break
    case 'bl': x = pad; y = H - pad - fs / 2; align = 'left'; break
    case 'bc': x = W / 2; y = H - pad - fs / 2; align = 'center'; break
    case 'cc': x = W / 2; y = H / 2; align = 'center'; break
    default: x = W - pad; y = H - pad - fs / 2; align = 'right'
  }
  ctx.textAlign = align
  ctx.shadowColor = 'rgba(0,0,0,.35)'
  ctx.shadowBlur = Math.max(2, fs * 0.12)
  ctx.fillText(wm.text, x, y)
  ctx.restore()
}

/** 3×3 unsharp 卷积，amount 0-1 */
export function sharpenCanvas(canvas: HTMLCanvasElement, amount: number): HTMLCanvasElement {
  if (amount <= 0) return canvas
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height
  if (W < 3 || H < 3) return canvas
  const src = ctx.getImageData(0, 0, W, H)
  const out = ctx.createImageData(W, H)
  const s = src.data, o = out.data
  const a = amount
  const center = 1 + 4 * a
  const side = -a
  const W4 = W * 4
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
        o[i] = s[i]; o[i + 1] = s[i + 1]; o[i + 2] = s[i + 2]; o[i + 3] = s[i + 3]
        continue
      }
      for (let c = 0; c < 3; c++) {
        const v = s[i + c] * center +
          s[i - 4 + c] * side + s[i + 4 + c] * side +
          s[i - W4 + c] * side + s[i + W4 + c] * side
        o[i + c] = v < 0 ? 0 : v > 255 ? 255 : v
      }
      o[i + 3] = s[i + 3]
    }
  }
  ctx.putImageData(out, 0, 0)
  return canvas
}

/* ============================================================
   导出管线：变换 → 裁剪 → 滤镜 → 圆角 → 水印 → 锐化 → 缩放 → 编码
   ============================================================ */
export function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(res => {
    try {
      canvas.toBlob(b => res(b), type, type === 'image/png' ? undefined : quality)
    } catch { res(null) }
  })
}

export async function buildOutput(
  file: ImgFile,
  edit: Edit,
  cfg: OutputConfig,
  formats: { webp: boolean; avif: boolean }
): Promise<OutputResult> {
  // 解析输出格式
  let type = cfg.format
  if (!type || type === 'auto') {
    const ft = file.file.type
    type = ft && ft !== '' ? ft : 'image/png'
    if (type === 'image/gif' || type === 'image/bmp' || type === 'image/svg+xml') type = 'image/png'
  }
  if (type === 'image/webp' && !formats.webp) type = 'image/jpeg'
  if (type === 'image/avif' && !formats.avif) type = 'image/jpeg'
  const lossy = type !== 'image/png'
  const needFill = (type === 'image/jpeg' && cfg.bgMode !== 'never') || cfg.bgMode === 'always'

  let canvas = getEditedCanvas(file)
  const e = edit
  const hasEdit = filterString(e) !== 'none' || e.radius > 0 || !!e.wm.text || e.sharpen > 0

  if (hasEdit || needFill) {
    const out = makeCanvas(canvas.width, canvas.height)
    const ctx = out.getContext('2d')!
    if (needFill) { ctx.fillStyle = cfg.bg; ctx.fillRect(0, 0, out.width, out.height) }
    ctx.filter = filterString(e)
    if (e.radius > 0) {
      const r = (e.radius / 100) * Math.min(out.width, out.height) / 2
      roundRectPath(ctx, 0, 0, out.width, out.height, r)
      ctx.clip()
    }
    ctx.drawImage(canvas, 0, 0)
    ctx.filter = 'none'
    if (e.wm.text) drawWatermark(ctx, out.width, out.height, e.wm)
    canvas = out
  }

  if (e.sharpen > 0) canvas = sharpenCanvas(canvas, e.sharpen / 100)

  // 尺寸限制（按比例缩放）
  if (cfg.maxW || cfg.maxH) {
    const sw = cfg.maxW ? cfg.maxW / canvas.width : 1
    const sh = cfg.maxH ? cfg.maxH / canvas.height : 1
    const s = Math.min(sw || 1, sh || 1, 1)
    if (s < 1) {
      const t = makeCanvas(canvas.width * s, canvas.height * s)
      const tc = t.getContext('2d')!
      if (needFill) { tc.fillStyle = cfg.bg; tc.fillRect(0, 0, t.width, t.height) }
      tc.imageSmoothingQuality = 'high'
      tc.drawImage(canvas, 0, 0, t.width, t.height)
      canvas = t
    }
  }

  // 编码（目标体积 → 二分搜索质量）
  let quality = clamp(cfg.quality, 0.05, 1)
  let blob: Blob | null = null
  if (cfg.targetBytes > 0 && lossy) {
    let lo = 0.05, hi = 1.0, best: { b: Blob; q: number } | null = null
    for (let i = 0; i < 8; i++) {
      const q = (lo + hi) / 2
      const b = await encode(canvas, type, q)
      if (!b) break
      if (b.size <= cfg.targetBytes) { best = { b, q }; lo = q } else { hi = q }
      if (b.size > cfg.targetBytes * 0.96 && b.size < cfg.targetBytes) break
    }
    if (best) { blob = best.b; quality = best.q } else {
      blob = await encode(canvas, type, 0.05)
      quality = 0.05
    }
  } else {
    blob = await encode(canvas, type, quality)
  }
  if (!blob) throw new Error('编码失败，浏览器可能不支持该格式')
  return { blob, type, width: canvas.width, height: canvas.height }
}

/* ============================================================
   文件名
   ============================================================ */
export function outName(file: ImgFile, type: string, edit: Edit): string {
  const ext = MIME_EXT[type] ?? 'img'
  const base = file.name.replace(/\.[^.]+$/, '')
  const wm = edit.wm.text ? '-wm' : ''
  const tr = file.tf.crop || file.tf.rotate ? '-edit' : ''
  return base + tr + wm + '.' + ext
}

const usedNames = new Set<string>()
export function uniqueName(name: string): string {
  if (!usedNames.has(name)) { usedNames.add(name); return name }
  const m = name.match(/^(.*?)(\.[^.]+)$/)
  const base = m ? m[1] : name
  const ext = m ? m[2] : ''
  let i = 1
  while (usedNames.has(base + '-' + i + ext)) i++
  const out = base + '-' + i + ext
  usedNames.add(out)
  return out
}

export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = uniqueName(name)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 6000)
}
