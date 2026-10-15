<template>
  <section class="pane" aria-label="转换">
    <div class="field">
      <span class="field-label">目标格式</span>
      <select class="select" v-model="store.settings.convFormat">
        <option value="image/jpeg">JPEG (.jpg)</option>
        <option value="image/png">PNG (.png)</option>
        <option value="image/webp" :disabled="!store.formats.webp">WebP (.webp)</option>
        <option value="image/avif" :disabled="!store.formats.avif">AVIF (.avif)</option>
      </select>
      <div class="field-hint">{{ supportText }}</div>
    </div>

    <div class="field">
      <div class="field-head">
        <span class="field-label">编码质量</span>
        <span class="chip">{{ isPng ? '无损' : Math.round(store.settings.convQuality * 100) + '%' }}</span>
      </div>
      <van-slider v-model="cq" :min="5" :max="100" :disabled="isPng" bar-active-color="var(--accent)" />
    </div>

    <div class="field">
      <span class="field-label">透明区域填充色</span>
      <div class="btn-row">
        <input type="color" v-model="store.settings.convBg" style="flex:0 0 52px;height:36px;padding:3px;border-radius:var(--radius);border:1px solid var(--border-strong);background:var(--panel);cursor:pointer" />
        <select class="select" v-model="store.settings.convBgMode">
          <option value="auto">智能：JPEG 时填充</option>
          <option value="always">总是填充</option>
          <option value="never">从不填充（保留透明）</option>
        </select>
      </div>
      <div class="field-hint">JPEG 不支持透明通道，转 JPEG 时透明区域会被此颜色填充。</div>
    </div>

    <button class="btn btn-primary btn-block" @click="downloadCurrent">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13l-3-3" /><path d="M20 16H7l3 3" /></svg>
      转换并下载
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { store } from '../store'
import { downloadCurrent } from '../composables/useExport'

const cq = computed({
  get: () => Math.round(store.settings.convQuality * 100),
  set: (v: number) => { store.settings.convQuality = v / 100 }
})
const isPng = computed(() => store.settings.convFormat === 'image/png')

const supportText = computed(() => {
  const w = store.formats.webp ? '✓ 支持 WebP' : '✗ 不支持 WebP'
  const a = store.formats.avif ? '✓ 支持 AVIF' : '✗ 不支持 AVIF'
  return w + ' · ' + a
})
</script>
