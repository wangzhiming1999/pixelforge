<template>
  <section class="pane" aria-label="压缩">
    <div class="field">
      <div class="field-head">
        <span class="field-label">压缩质量</span>
        <span class="chip">{{ isPng ? '无损' : Math.round(store.settings.quality * 100) + '%' }}</span>
      </div>
      <van-slider v-model="q" :min="5" :max="100" :disabled="isPng" bar-active-color="var(--accent)" />
      <div class="field-hint">质量越低文件越小。JPEG / WebP / AVIF 有效，PNG 忽略此项。</div>
    </div>

    <div class="field">
      <span class="field-label">输出格式</span>
      <select class="select" v-model="store.settings.outFormat">
        <option value="auto">跟随原格式</option>
        <option value="image/jpeg">JPEG（兼容性最好）</option>
        <option value="image/webp" :disabled="!store.formats.webp">WebP（体积小）</option>
        <option value="image/png">PNG（无损）</option>
        <option value="image/avif" :disabled="!store.formats.avif">AVIF（体积最小）</option>
      </select>
    </div>

    <div class="divider"></div>

    <div class="field">
      <span class="field-label">尺寸限制（可选）</span>
      <div class="btn-row">
        <input class="input" type="number" min="0" placeholder="最大宽度 px" v-model="store.settings.maxW" />
        <input class="input" type="number" min="0" placeholder="最大高度 px" v-model="store.settings.maxH" />
      </div>
      <div class="field-hint">按比例缩放，不会变形。留空表示保持原尺寸。</div>
    </div>

    <div class="field">
      <div class="field-head">
        <span class="field-label">目标文件大小（可选）</span>
        <span class="chip">{{ targetText }}</span>
      </div>
      <div class="target-row">
        <van-slider class="slider" v-model="targetSlider" :min="0" :max="2048" :step="5" :disabled="isPng"
                    bar-active-color="var(--accent)" />
        <input class="input" style="flex:0 0 86px;height:32px;text-align:center" type="number" min="0"
               placeholder="KB" :value="store.settings.targetKB || ''" :disabled="isPng"
               @input="onTargetInput" />
      </div>
      <div class="field-hint">自动搜索最接近目标的压缩质量，0 表示不限。仅 JPEG / WebP / AVIF 适用。</div>
    </div>

    <button class="btn btn-primary btn-block" @click="downloadCurrent">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M4 20h16" /></svg>
      下载当前图片
    </button>

    <div class="result-card" v-if="activeFile?.outSize">
      <div class="result-row"><span>输出体积</span><b>{{ fmtBytes(activeFile.outSize.size) }}  {{ activeFile.outSize.width }} × {{ activeFile.outSize.height }}</b></div>
      <div class="result-row">
        <span>压缩率</span>
        <b :style="{ color: ratio >= 0 ? 'var(--ok)' : 'var(--danger)' }">{{ ratio >= 0 ? '↓ ' : '↑ ' }}{{ Math.abs(ratio).toFixed(1) }}%</b>
      </div>
      <div class="result-row" v-if="activeFile.outTarget">
        <span>目标体积</span>
        <b :style="{ color: hit ? 'var(--ok)' : 'var(--warn)' }">{{ fmtBytes(activeFile.outTarget) }} {{ hit ? '✓ 达标' : '✗ 未达标' }}</b>
      </div>
      <div class="bar"><i :style="{ width: Math.min(100, Math.abs(ratio)) + '%', background: ratio >= 0 ? 'var(--ok)' : 'var(--danger)' }"></i></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { store, activeFile, setTargetKB } from '../store'
import { fmtBytes } from '../core/image'
import { downloadCurrent } from '../composables/useExport'

const q = computed({
  get: () => Math.round(store.settings.quality * 100),
  set: (v: number) => { store.settings.quality = v / 100 }
})

const isPng = computed(() => store.settings.outFormat === 'image/png')

const targetSlider = computed({
  get: () => Math.min(2048, store.settings.targetKB),
  set: (v: number) => setTargetKB(v)
})
function onTargetInput(ev: Event) {
  setTargetKB(parseInt((ev.target as HTMLInputElement).value, 10) || 0)
}
const targetText = computed(() => {
  const v = store.settings.targetKB
  if (isPng.value) return '不支持'
  if (!v) return '关闭'
  return v >= 1024 ? (v / 1024).toFixed(1).replace(/\.0$/, '') + ' MB' : v + ' KB'
})

const ratio = computed(() => {
  const f = activeFile.value
  if (!f?.outSize || !f.size) return 0
  return (1 - f.outSize.size / f.size) * 100
})
const hit = computed(() => {
  const f = activeFile.value
  return !!f?.outSize && (!f.outTarget || f.outSize.size <= f.outTarget)
})
</script>
