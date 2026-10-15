<template>
  <section class="pane" aria-label="美化">
    <div class="group">
      <div class="group-title">基础调整</div>
      <div v-for="a in BASE" :key="a.key" class="field">
        <div class="field-head">
          <span class="field-label">{{ a.label }}</span>
          <span class="chip">{{ fmtVal(a) }}</span>
        </div>
        <van-slider v-model="store.edit[a.key]" :min="a.min" :max="a.max" :step="a.step"
                    bar-active-color="var(--accent)" />
      </div>
      <div class="field-hint">锐化在导出时生效（预览不做卷积计算以保证流畅）。</div>
    </div>

    <div class="divider"></div>

    <div class="group">
      <div class="group-title">风格滤镜</div>
      <div v-for="a in STYLE" :key="a.key" class="field">
        <div class="field-head">
          <span class="field-label">{{ a.label }}</span>
          <span class="chip">{{ store.edit[a.key] }}%</span>
        </div>
        <van-slider v-model="store.edit[a.key]" :min="0" :max="a.key === 'saturate' ? 250 : 100"
                    bar-active-color="var(--accent)" />
      </div>
      <div class="swatches">
        <button v-for="(p, i) in PRESETS" :key="p.name" class="swatch" :title="p.name"
                :style="{ background: presetBg(p) }" @click="applyPreset(p)" :data-preset="i"></button>
      </div>
    </div>

    <div class="divider"></div>

    <div class="group">
      <div class="group-title">圆角</div>
      <div class="field">
        <div class="field-head">
          <span class="field-label">圆角半径</span>
          <span class="chip">{{ store.edit.radius }}</span>
        </div>
        <van-slider v-model="store.edit.radius" :min="0" :max="50" bar-active-color="var(--accent)" />
      </div>
    </div>

    <div class="divider"></div>

    <div class="group">
      <div class="group-title">文字水印</div>
      <input class="input" type="text" placeholder="水印文字，留空则不添加" maxlength="40" v-model="store.edit.wm.text" />
      <div class="btn-row">
        <input type="color" v-model="store.edit.wm.color" style="flex:0 0 52px;height:36px;padding:3px;border-radius:var(--radius);border:1px solid var(--border-strong);background:var(--panel);cursor:pointer" />
        <select class="select" v-model="store.edit.wm.pos">
          <option value="br">右下角</option>
          <option value="bl">左下角</option>
          <option value="tr">右上角</option>
          <option value="tl">左上角</option>
          <option value="bc">底部居中</option>
          <option value="cc">正中央</option>
        </select>
      </div>
      <div class="field">
        <div class="field-head">
          <span class="field-label">字号</span>
          <span class="chip">{{ store.edit.wm.size.toFixed(1) }}%</span>
        </div>
        <van-slider v-model="store.edit.wm.size" :min="1" :max="20" :step="0.5" bar-active-color="var(--accent)" />
      </div>
      <div class="field">
        <div class="field-head">
          <span class="field-label">不透明度</span>
          <span class="chip">{{ store.edit.wm.opacity }}%</span>
        </div>
        <van-slider v-model="store.edit.wm.opacity" :min="5" :max="100" bar-active-color="var(--accent)" />
      </div>
    </div>

    <div class="divider"></div>

    <div class="btn-row">
      <button class="btn btn-sm" @click="resetEdit">重置全部调整</button>
    </div>
    <button class="btn btn-primary btn-block" @click="downloadCurrent">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M4 20h16" /></svg>
      导出图片
    </button>
  </section>
</template>

<script setup lang="ts">
import { store, resetEdit, applyPreset } from '../store'
import { PRESETS } from '../types'
import { downloadCurrent } from '../composables/useExport'
import type { Preset } from '../types'

type NumEditKey = 'brightness' | 'contrast' | 'saturate' | 'hue' | 'blur' | 'sharpen' | 'grayscale' | 'sepia' | 'invert'
interface Adj { key: NumEditKey; label: string; min: number; max: number; step?: number; unit?: string }
const BASE: Adj[] = [
  { key: 'brightness', label: '亮度', min: 20, max: 200 },
  { key: 'contrast', label: '对比度', min: 20, max: 200 },
  { key: 'saturate', label: '饱和度', min: 0, max: 250 },
  { key: 'hue', label: '色相偏移', min: -180, max: 180, unit: '°' },
  { key: 'blur', label: '模糊 / 柔化', min: 0, max: 20, step: 0.5 },
  { key: 'sharpen', label: '锐化', min: 0, max: 100 }
]
const STYLE: Adj[] = [
  { key: 'grayscale', label: '黑白', min: 0, max: 100 },
  { key: 'sepia', label: '复古棕褐', min: 0, max: 100 },
  { key: 'invert', label: '反色', min: 0, max: 100 }
]

function fmtVal(a: Adj) {
  const v = (store.edit as unknown as Record<string, number>)[a.key]
  return v + (a.unit ?? '')
}

function presetBg(p: Preset): string {
  const v = p.v
  if (v.invert === 100) return 'linear-gradient(135deg,#111,#eee)'
  if (v.grayscale === 100) return 'linear-gradient(135deg,#1f1f1f,#cfcfcf)'
  if (v.sepia > 15) return 'linear-gradient(135deg,#c9a179,#f0dcc2)'
  if (v.contrast > 140) return 'linear-gradient(135deg,#0b0b0b,#fafafa)'
  if (v.saturate < 90) return 'linear-gradient(135deg,#8fa8b8,#dfe9ef)'
  if (v.saturate > 118) return 'linear-gradient(135deg,#f97316,#22c55e)'
  return 'linear-gradient(135deg,#94a3b8,#e2e8f0)'
}
</script>
