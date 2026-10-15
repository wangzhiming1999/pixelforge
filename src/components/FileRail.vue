<template>
  <div class="file-rail-inner" style="display:flex;flex-direction:column;min-height:0;flex:1">
    <div class="pane-label" style="padding:0 4px">
      <span>文件列表</span>
      <span>{{ store.files.length }}</span>
    </div>

    <div class="file-list">
      <div v-if="!store.files.length" class="rail-empty">还没有图片<br />点击上方按钮或拖拽导入</div>
      <div
        v-for="f in store.files" :key="f.id"
        class="file-item" :class="{ active: f.id === store.activeId }"
        @click="selectFile(f.id)"
      >
        <div class="file-thumb"><img :src="f.thumb" alt="" loading="lazy" /></div>
        <div class="file-meta">
          <div class="file-name" :title="f.name">{{ f.name }}</div>
          <div class="file-sub">
            {{ fmtBytes(f.size) }}<template v-if="f.outSize">
              <span class="arrow">→</span><span :class="saveCls(f)">{{ fmtBytes(f.outSize.size) }} {{ arrow(f) }}{{ pct(f) }}%</span>
            </template>
          </div>
        </div>
        <button class="file-del" title="移除" @click.stop="removeFile(f.id)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
    </div>

    <div class="rail-foot" v-if="store.files.length">
      <div class="stat-line"><span>原图合计</span><b>{{ fmtBytes(stats.totalIn) }}</b></div>
      <div class="stat-line"><span>输出合计</span><b>{{ stats.totalOut ? fmtBytes(stats.totalOut) : '—' }}</b></div>
      <div class="stat-line"><span>节省</span><b :style="{ color: (stats.savePct ?? 0) >= 0 ? 'var(--ok)' : 'var(--danger)' }">
        {{ stats.savePct === null ? '—' : (stats.savePct >= 0 ? '↓ ' : '↑ ') + Math.abs(stats.savePct).toFixed(1) + '%' }}
      </b></div>
      <div class="btn-row" style="margin-top:2px">
        <button class="btn btn-sm" @click="processAll">批量处理</button>
        <button class="btn btn-sm btn-ghost" @click="onClear">清空</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { showConfirmDialog } from 'vant'
import { store, selectFile, removeFile, clearAll, stats } from '../store'
import { fmtBytes } from '../core/image'
import { processAll } from '../composables/useExport'
import type { ImgFile } from '../types'

function pct(f: ImgFile) {
  if (!f.outSize || !f.size) return 0
  return Math.abs((1 - f.outSize.size / f.size) * 100).toFixed(0)
}
function arrow(f: ImgFile) {
  return f.outSize && f.outSize.size <= f.size ? '↓' : '↑'
}
function saveCls(f: ImgFile) {
  return f.outSize && f.outSize.size <= f.size ? 'good' : 'bad'
}
async function onClear() {
  if (!store.files.length) return
  try {
    await showConfirmDialog({ title: '清空全部图片？', message: `将移除 ${store.files.length} 张图片` })
  } catch { return }
  clearAll()
}
</script>
