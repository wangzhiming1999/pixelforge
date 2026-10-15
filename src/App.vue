<template>
  <div>
    <header class="app-header">
      <div class="brand">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
        PixelForge
        <small>图片工坊</small>
      </div>
      <div class="header-spacer"></div>
      <div class="badge-local"><span class="dot"></span>本地处理 · 不上传</div>
      <button class="btn btn-primary btn-sm mobile-files-btn" @click="pick">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
        添加图片
      </button>
      <button class="btn btn-sm" title="切换主题" @click="toggleTheme">{{ store.theme === 'dark' ? '☀️' : '🌙' }}</button>
    </header>

    <main class="app-shell">
      <!-- 桌面：左栏文件 -->
      <aside class="rail">
        <div class="rail-head">
          <button class="btn btn-primary btn-block" @click="pick">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
            <span>添加图片</span>
          </button>
        </div>
        <FileRail />
      </aside>

      <!-- 中：舞台 -->
      <StageView />

      <!-- 右：工具面板 -->
      <aside class="tools">
        <div class="tabs">
          <button v-for="t in TOOLS" :key="t.key" class="tab" :class="{ active: store.tool === t.key }" @click="store.tool = t.key">
            {{ t.label }}
          </button>
        </div>
        <div class="panes">
          <PanelCompress v-show="store.tool === 'compress'" />
          <PanelConvert v-show="store.tool === 'convert'" />
          <PanelCrop v-show="store.tool === 'crop'" />
          <PanelEdit v-show="store.tool === 'edit'" />
        </div>
      </aside>
    </main>

    <!-- 移动端底部导航 -->
    <van-tabbar v-model="tabIdx" placeholder safe-area-inset-bottom @change="onTabChange">
      <van-tabbar-item icon="apps-o">文件</van-tabbar-item>
      <van-tabbar-item icon="down">压缩</van-tabbar-item>
      <van-tabbar-item icon="exchange">转换</van-tabbar-item>
      <van-tabbar-item icon="crop">裁剪</van-tabbar-item>
      <van-tabbar-item icon="photo-o">美化</van-tabbar-item>
    </van-tabbar>

    <van-popup v-model:show="filesOpen" position="bottom" round :style="{ height: '72%' }">
      <div style="display:flex;flex-direction:column;height:100%;padding:12px">
        <div style="font-weight:650;margin-bottom:10px">文件列表</div>
        <FileRail />
      </div>
    </van-popup>

    <!-- 全局拖拽遮罩 -->
    <div class="drag-veil" :class="{ on: hot }"><div class="inner">松开鼠标，添加到文件列表</div></div>

    <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onPick" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { showLoadingToast, closeToast } from 'vant'
import { store, toggleTheme, addFiles, detectFormatsAndApply } from './store'
import { downloadCurrent } from './composables/useExport'
import StageView from './components/StageView.vue'
import FileRail from './components/FileRail.vue'
import PanelCompress from './components/PanelCompress.vue'
import PanelConvert from './components/PanelConvert.vue'
import PanelCrop from './components/PanelCrop.vue'
import PanelEdit from './components/PanelEdit.vue'

const TOOLS = [
  { key: 'compress', label: '压缩' },
  { key: 'convert', label: '转换' },
  { key: 'crop', label: '裁剪' },
  { key: 'edit', label: '美化' }
] as const

const tabIdx = ref(1)
const filesOpen = ref(false)

watch(() => store.tool, t => {
  const i = TOOLS.findIndex(x => x.key === t)
  if (i >= 0) tabIdx.value = i + 1
})
function onTabChange(idx: number | string) {
  const i = Number(idx)
  if (i === 0) {
    filesOpen.value = true
    tabIdx.value = TOOLS.findIndex(x => x.key === store.tool) + 1
  } else {
    store.tool = TOOLS[i - 1].key
  }
}

/* 主题同步 */
watch(() => store.theme, t => {
  document.documentElement.dataset.theme = t
}, { immediate: true })

/* 文件选择 */
const fileInput = ref<HTMLInputElement | null>(null)
function pick() { fileInput.value?.click() }
function onPick(ev: Event) {
  const input = ev.target as HTMLInputElement
  addFiles(input.files)
  input.value = ''
}

/* 拖拽 + 粘贴 */
const hot = ref(false)
let dragTimer: ReturnType<typeof setTimeout> | undefined
function onDragEnter(e: DragEvent) {
  if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return
  e.preventDefault()
  hot.value = true
  clearTimeout(dragTimer)
}
function onDragOver(e: DragEvent) { e.preventDefault() }
function onDragLeave(e: DragEvent) {
  if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
    hot.value = false
  }
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  hot.value = false
  if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files)
}
function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items ?? []
  const files: File[] = []
  for (const it of items) {
    if (it.kind === 'file') { const f = it.getAsFile(); if (f) files.push(f) }
  }
  if (files.length) { e.preventDefault(); addFiles(files) }
}
function onKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
  const map: Record<string, string> = { '1': 'compress', '2': 'convert', '3': 'crop', '4': 'edit' }
  if (map[e.key]) store.tool = map[e.key] as typeof store.tool
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    downloadCurrent()
  }
}

onMounted(() => {
  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('drop', onDrop)
  window.addEventListener('paste', onPaste)
  window.addEventListener('keydown', onKeydown)
  showLoadingToast({ message: '检测编码能力…', duration: 0 })
  detectFormatsAndApply().finally(() => closeToast(true))
})
onBeforeUnmount(() => {
  window.removeEventListener('dragenter', onDragEnter)
  window.removeEventListener('dragover', onDragOver)
  window.removeEventListener('dragleave', onDragLeave)
  window.removeEventListener('drop', onDrop)
  window.removeEventListener('paste', onPaste)
  window.removeEventListener('keydown', onKeydown)
})
</script>
