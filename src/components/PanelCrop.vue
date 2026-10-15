<template>
  <section class="pane" aria-label="裁剪">
    <div class="field">
      <span class="field-label">宽高比例</span>
      <div class="ratio-grid">
        <button v-for="r in RATIOS" :key="r.key" class="btn-ratio" :class="{ active: isActive(r) }" @click="setRatio(r)">
          {{ r.label }}
        </button>
      </div>
    </div>

    <div class="field">
      <span class="field-label">旋转与翻转</span>
      <div class="btn-row">
        <button class="icon-btn" title="逆时针 90°" @click="rotate(-90)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9" /><path d="M3 3v6h6" />
          </svg>
        </button>
        <button class="icon-btn" title="顺时针 90°" @click="rotate(90)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9" /><path d="M21 3v6h-6" />
          </svg>
        </button>
        <button class="icon-btn" title="水平翻转" @click="flip('h')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v18" /><path d="M8 8L4 12l4 4z" /><path d="M16 8l4 4-4 4z" />
          </svg>
        </button>
        <button class="icon-btn" title="垂直翻转" @click="flip('v')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12h18" /><path d="M8 8l4-4 4 4z" /><path d="M8 16l4 4 4-4z" />
          </svg>
        </button>
      </div>
    </div>

    <div class="field">
      <span class="field-label">裁剪框（像素）</span>
      <div class="btn-row">
        <input class="input" type="number" placeholder="X" :value="Math.round(store.crop.x)" @input="setCrop('x', $event)" />
        <input class="input" type="number" placeholder="Y" :value="Math.round(store.crop.y)" @input="setCrop('y', $event)" />
      </div>
      <div class="btn-row">
        <input class="input" type="number" placeholder="宽" :value="Math.round(store.crop.w)" @input="setCrop('w', $event)" />
        <input class="input" type="number" placeholder="高" :value="Math.round(store.crop.h)" @input="setCrop('h', $event)" />
      </div>
      <div class="field-hint">在图片上拖动调整裁剪范围，也可直接输入数值。</div>
    </div>

    <div class="btn-row">
      <button class="btn btn-sm" @click="resetCrop">重置裁剪</button>
      <button class="btn btn-sm" @click="centerSquare">居中正方形</button>
    </div>

    <div class="divider"></div>

    <div class="field">
      <div class="field-head">
        <span class="field-label">输出质量</span>
        <span class="chip">{{ Math.round(store.settings.cropQuality * 100) + '%' }}</span>
      </div>
      <van-slider v-model="crq" :min="5" :max="100" bar-active-color="var(--accent)" />
    </div>

    <button class="btn btn-primary btn-block" @click="downloadCurrent">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 002 2h14" /><path d="M18 22V8a2 2 0 00-2-2H2" /></svg>
      裁剪并下载
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { showToast } from 'vant'
import { store, activeFile, resetCropToFull, commitCrop } from '../store'
import { getBaseSize, clamp } from '../core/image'
import { downloadCurrent } from '../composables/useExport'

interface RatioDef { key: string; label: string; v: number | null }
const RATIOS: RatioDef[] = [
  { key: 'free', label: '自由', v: null },
  { key: '1', label: '1 : 1', v: 1 },
  { key: '4-3', label: '4 : 3', v: 4 / 3 },
  { key: '3-4', label: '3 : 4', v: 3 / 4 },
  { key: '16-9', label: '16 : 9', v: 16 / 9 },
  { key: '9-16', label: '9 : 16', v: 9 / 16 }
]
const isActive = (r: RatioDef) => store.crop.ratio === r.v

function setRatio(r: RatioDef) {
  store.crop.ratio = r.v
  const f = activeFile.value
  if (!f || !r.v) { commitCrop(); return }
  // 按当前框中心重新适配比例
  const b = getBaseSize(f)
  const cx = store.crop.x + store.crop.w / 2
  const cy = store.crop.y + store.crop.h / 2
  let w = store.crop.w, h = w / r.v
  if (h > b.h) { h = b.h; w = h * r.v }
  if (w > b.w) { w = b.w; h = w / r.v }
  store.crop.w = w; store.crop.h = h
  store.crop.x = clamp(cx - w / 2, 0, b.w - w)
  store.crop.y = clamp(cy - h / 2, 0, b.h - h)
  commitCrop()
}

function rotate(deg: number) {
  const f = activeFile.value
  if (!f) { showToast('请先添加图片'); return }
  f.tf.rotate = ((f.tf.rotate + deg) % 360 + 360) % 360
  resetCropToFull()
}
function flip(axis: 'h' | 'v') {
  const f = activeFile.value
  if (!f) { showToast('请先添加图片'); return }
  if (axis === 'h') f.tf.flipH = !f.tf.flipH
  else f.tf.flipV = !f.tf.flipV
  resetCropToFull()
}

function setCrop(k: 'x' | 'y' | 'w' | 'h', ev: Event) {
  const f = activeFile.value
  if (!f) return
  const b = getBaseSize(f)
  let v = parseFloat((ev.target as HTMLInputElement).value) || 0
  if (k === 'w') { store.crop.w = clamp(v, 1, b.w); v = store.crop.w }
  else if (k === 'h') { store.crop.h = clamp(v, 1, b.h); v = store.crop.h }
  else if (k === 'x') store.crop.x = clamp(v, 0, Math.max(0, b.w - store.crop.w))
  else store.crop.y = clamp(v, 0, Math.max(0, b.h - store.crop.h))
  commitCrop()
}

function resetCrop() {
  resetCropToFull()
  store.crop.ratio = null
}

function centerSquare() {
  const f = activeFile.value
  if (!f) return
  const b = getBaseSize(f)
  const s = Math.min(b.w, b.h)
  store.crop.w = s; store.crop.h = s
  store.crop.x = (b.w - s) / 2; store.crop.y = (b.h - s) / 2
  store.crop.ratio = 1
  commitCrop()
}

const crq = computed({
  get: () => Math.round(store.settings.cropQuality * 100),
  set: (v: number) => { store.settings.cropQuality = v / 100 }
})
</script>

<style scoped>
.btn-ratio {
  height: 32px; border-radius: 8px; border: 1px solid var(--border-strong);
  background: var(--panel); cursor: pointer; font-size: 12px; color: var(--dim); font-weight: 550; transition: .12s;
}
.btn-ratio:hover { border-color: var(--faint); color: var(--text) }
.btn-ratio.active { background: var(--accent-soft); border-color: color-mix(in srgb, var(--accent) 45%, transparent); color: var(--accent) }
</style>
