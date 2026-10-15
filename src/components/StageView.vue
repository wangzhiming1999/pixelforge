<template>
  <section class="stage">
    <div class="stage-bar">
      <span class="stage-name">{{ activeFile?.name ?? '未选择文件' }}</span>
      <span class="chip" v-if="activeFile">{{ dimText }}</span>
      <span class="chip" v-if="activeFile">{{ fmtBytes(activeFile.size) }}</span>
      <span class="spacer"></span>
      <button
        v-if="activeFile"
        class="btn btn-sm btn-ghost"
        @pointerdown.prevent="store.compare = true"
        @pointerup="store.compare = false"
        @pointerleave="store.compare = false"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3v18M3 7.5A3.5 3.5 0 016.5 4h11A3.5 3.5 0 0121 7.5v9a3.5 3.5 0 01-3.5 3.5h-11A3.5 3.5 0 013 16.5z" />
        </svg>
        按住看原图
      </button>
    </div>

    <div class="stage-view" ref="viewEl" @pointerdown="onPointerDown" @pointermove="onPointerMove"
         @pointerup="onPointerUp" @pointercancel="onPointerUp">
      <div v-if="!activeFile" class="dropzone" :class="{ hot: hot }">
        <div class="dz-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v13" />
          </svg>
        </div>
        <h2>把图片拖进来</h2>
        <p>支持 JPG / PNG / WebP / GIF / BMP / AVIF 等格式<br />也可以直接 <kbd>Ctrl</kbd>+<kbd>V</kbd> 粘贴剪贴板图片</p>
        <button class="btn btn-primary" @click="pick">选择图片</button>
        <div class="dz-hint">全部处理都在本地浏览器完成，图片不会上传到任何服务器</div>
      </div>

      <template v-else>
        <div class="canvas-wrap checker" :style="{ width: dispW + 'px', height: dispH + 'px' }">
          <canvas ref="canvasEl" class="stage-canvas" :style="{ width: dispW + 'px', height: dispH + 'px' }"></canvas>
          <div v-if="isCropTool" class="crop-overlay">
            <div class="crop-box" :style="boxStyle">
              <div class="grid9"></div>
              <div class="size-tag">{{ Math.round(store.crop.w) }} × {{ Math.round(store.crop.h) }}</div>
              <span v-for="h in HANDLES" :key="h" class="ch" :data-h="h"></span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onPick" />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { store, activeFile, commitCrop, addFiles } from '../store'
import {
  clamp, drawWatermark, filterString, fmtBytes, getBaseSize, getEditedCanvas,
  getRotatedCanvas, makeCanvas, roundRectPath
} from '../core/image'
import type { ImgFile } from '../types'

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const

const viewEl = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const hot = ref(false)

const dispW = ref(0)
const dispH = ref(0)
const scale = ref(1)
let dpr = Math.min(2, window.devicePixelRatio || 1)

const isCropTool = computed(() => store.tool === 'crop')
const dimText = computed(() => {
  if (!activeFile.value) return ''
  if (isCropTool.value) return fmtDimBase() + ' 原图'
  return outDims().w + ' × ' + outDims().h
})
function fmtDimBase() {
  const b = getBaseSize(activeFile.value!)
  return b.w + ' × ' + b.h
}
function outDims() {
  const f = activeFile.value!
  const b = getBaseSize(f)
  const c = f.tf.crop
  return { w: Math.round(c ? clamp(c.w, 1, b.w) : b.w), h: Math.round(c ? clamp(c.h, 1, b.h) : b.h) }
}

/* ---------- 底图缓存：避免拖动滑块时反复生成变换画布 ---------- */
let cacheKey = ''
let cachedBase: HTMLCanvasElement | null = null
function baseCanvasFor(f: ImgFile, cropping: boolean): HTMLCanvasElement {
  const key = f.id + '|' + JSON.stringify(f.tf) + '|' + (cropping ? 'c' : 'e') + '|' + store.compare
  if (key === cacheKey && cachedBase) return cachedBase
  let c: HTMLCanvasElement
  if (cropping) {
    const rot = getRotatedCanvas(f)
    if (rot) c = rot
    else { c = makeCanvas(f.width, f.height); c.getContext('2d')!.drawImage(f.source, 0, 0) }
  } else {
    c = getEditedCanvas(f)
  }
  cacheKey = key
  cachedBase = c
  return c
}
watch(() => store.compare, () => { cacheKey = '' })

/* ---------- 绘制 ---------- */
let rafId = 0
function requestDraw() {
  if (rafId) return
  rafId = requestAnimationFrame(() => { rafId = 0; draw() })
}

function draw() {
  const f = activeFile.value
  const canvas = canvasEl.value
  if (!f || !canvas || dispW.value <= 0) return
  canvas.width = Math.max(1, Math.round(dispW.value * dpr))
  canvas.height = Math.max(1, Math.round(dispH.value * dpr))
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, dispW.value, dispH.value)

  const e = store.edit
  if (store.compare) {
    ctx.filter = 'none'
    ctx.drawImage(f.source, 0, 0, dispW.value, dispH.value)
    return
  }
  const src = baseCanvasFor(f, isCropTool.value)
  ctx.filter = filterString(e)
  if (e.radius > 0 && !isCropTool.value) {
    const r = (e.radius / 100) * Math.min(dispW.value, dispH.value) / 2
    roundRectPath(ctx, 0, 0, dispW.value, dispH.value, r)
    ctx.clip()
  }
  ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, dispW.value, dispH.value)
  ctx.filter = 'none'
  if (!isCropTool.value) drawWatermark(ctx, dispW.value, dispH.value, e.wm)
}

/* ---------- 布局 ---------- */
function layout() {
  const f = activeFile.value
  const view = viewEl.value
  if (!f || !view) { dispW.value = 0; dispH.value = 0; return }
  const src = isCropTool.value ? getBaseSize(f) : outDims()
  const mobile = window.innerWidth <= 820
  const pad = mobile ? 16 : 40
  const availW = Math.max(40, view.clientWidth - pad)
  const availH = Math.max(40, view.clientHeight - pad)
  let s = Math.min(availW / src.w, availH / src.h, 1)
  if (!isFinite(s) || s <= 0) s = 1
  scale.value = s
  dispW.value = Math.max(1, Math.round(src.w * s))
  dispH.value = Math.max(1, Math.round(src.h * s))
  requestDraw()
}

let ro: ResizeObserver | null = null
onMounted(() => {
  ro = new ResizeObserver(() => layout())
  if (viewEl.value) ro.observe(viewEl.value)
  layout()
})
onBeforeUnmount(() => ro?.disconnect())

watch([activeFile, isCropTool], () => { cacheKey = ''; layout() })
watch(() => store.edit, () => requestDraw(), { deep: true })
watch(store.crop, () => { commitCrop() }, { deep: true })

/* ---------- 裁剪拖拽 ---------- */
const boxStyle = computed(() => {
  const s = scale.value
  return {
    left: store.crop.x * s + 'px',
    top: store.crop.y * s + 'px',
    width: store.crop.w * s + 'px',
    height: store.crop.h * s + 'px'
  }
})

let drag: null | {
  mode: string; startX: number; startY: number
  ox: number; oy: number; ow: number; oh: number; scale: number
} = null

function onPointerDown(ev: PointerEvent) {
  if (!isCropTool.value || !activeFile.value) return
  const target = ev.target as HTMLElement
  const handle = target.closest('.ch') as HTMLElement | null
  const box = target.closest('.crop-box')
  if (!handle && !box) return
  ev.preventDefault()
  drag = {
    mode: handle?.dataset.h ?? 'move',
    startX: ev.clientX, startY: ev.clientY,
    ox: store.crop.x, oy: store.crop.y, ow: store.crop.w, oh: store.crop.h,
    scale: scale.value
  }
  viewEl.value?.setPointerCapture(ev.pointerId)
}

function onPointerMove(ev: PointerEvent) {
  if (!drag || !activeFile.value) return
  ev.preventDefault()
  const b = getBaseSize(activeFile.value)
  const dx = (ev.clientX - drag.startX) / drag.scale
  const dy = (ev.clientY - drag.startY) / drag.scale
  const MIN = Math.max(8, Math.min(b.w, b.h) * 0.02)
  const m = drag.mode

  let nx = drag.ox, ny = drag.oy, nw = drag.ow, nh = drag.oh
  if (m === 'move') {
    nx = clamp(drag.ox + dx, 0, b.w - drag.ow)
    ny = clamp(drag.oy + dy, 0, b.h - drag.oh)
  } else {
    let left = drag.ox, top = drag.oy
    let right = drag.ox + drag.ow, bottom = drag.oy + drag.oh
    if (m.includes('w')) left = clamp(drag.ox + dx, 0, right - MIN)
    if (m.includes('e')) right = clamp(drag.ox + drag.ow + dx, left + MIN, b.w)
    if (m.includes('n')) top = clamp(drag.oy + dy, 0, bottom - MIN)
    if (m.includes('s')) bottom = clamp(drag.oy + drag.oh + dy, top + MIN, b.h)
    nx = left; ny = top; nw = right - left; nh = bottom - top

    const ratio = store.crop.ratio
    if (ratio) {
      const isCorner = m.length === 2
      if (isCorner) {
        const anchorX = m.includes('w') ? right : left
        const anchorY = m.includes('n') ? bottom : top
        let tw = nw, th = nw / ratio
        const maxH = m.includes('n') ? anchorY : b.h - anchorY
        if (th > maxH) { th = maxH; tw = th * ratio }
        if (tw > b.w) { tw = b.w; th = tw / ratio }
        nx = m.includes('w') ? anchorX - tw : anchorX
        ny = m.includes('n') ? anchorY - th : anchorY
        nw = tw; nh = th
      } else if (m === 'e' || m === 'w') {
        nw = clamp(nw, MIN, b.w)
        nh = nw / ratio
        const cy = drag.oy + drag.oh / 2
        ny = clamp(cy - nh / 2, 0, Math.max(0, b.h - nh))
        if (nh > b.h) { nh = b.h; nw = nh * ratio; if (m === 'w') nx = right - nw }
      } else {
        nh = clamp(nh, MIN, b.h)
        nw = nh * ratio
        const cx = drag.ox + drag.ow / 2
        nx = clamp(cx - nw / 2, 0, Math.max(0, b.w - nw))
        if (nw > b.w) { nw = b.w; nh = nw / ratio; if (m === 'n') ny = bottom - nh }
      }
      nx = clamp(nx, 0, Math.max(0, b.w - nw))
      ny = clamp(ny, 0, Math.max(0, b.h - nh))
    }
  }
  store.crop.x = nx; store.crop.y = ny; store.crop.w = nw; store.crop.h = nh
}

function onPointerUp(ev: PointerEvent) {
  if (!drag) return
  drag = null
  try { viewEl.value?.releasePointerCapture(ev.pointerId) } catch { /* ignore */ }
}

/* ---------- 选择文件 ---------- */
function pick() { fileInput.value?.click() }
function onPick(ev: Event) {
  const input = ev.target as HTMLInputElement
  addFiles(input.files)
  input.value = ''
}
</script>
