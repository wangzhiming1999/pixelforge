import { computed, reactive } from 'vue'
import { showToast } from 'vant'
import { clamp, decodeImage, detectFormat, getBaseSize, lsGet, lsSet } from './core/image'
import { defaultEdit, newTf, type Edit, type ImgFile, type OutputConfig, type Preset } from './types'

export type Tool = 'compress' | 'convert' | 'crop' | 'edit'

export const store = reactive({
  files: [] as ImgFile[],
  activeId: null as string | null,
  tool: 'compress' as Tool,
  compare: false,
  formats: { webp: false, avif: false },
  edit: defaultEdit() as Edit,
  // 裁剪工作框（相对变换后的图像坐标），实时写回 active 文件的 tf.crop
  crop: { x: 0, y: 0, w: 0, h: 0, ratio: null as number | null },
  theme: (lsGet('pf-theme') ?? 'light') as 'light' | 'dark',
  settings: {
    quality: 0.78,
    outFormat: 'auto',
    maxW: '',
    maxH: '',
    targetKB: 0,
    convFormat: 'image/jpeg',
    convQuality: 0.9,
    convBg: '#ffffff',
    convBgMode: 'auto' as 'auto' | 'always' | 'never',
    cropQuality: 0.9
  }
})

/* ---------- 派生 ---------- */
export const activeFile = computed<ImgFile | null>(
  () => store.files.find(f => f.id === store.activeId) ?? null
)

export const stats = computed(() => {
  const totalIn = store.files.reduce((a, f) => a + f.size, 0)
  const totalOut = store.files.reduce((a, f) => a + (f.outSize?.size ?? 0), 0)
  return {
    totalIn,
    totalOut,
    savePct: totalOut && totalIn ? (1 - totalOut / totalIn) * 100 : null
  }
})

/* ---------- 文件 ---------- */
export async function addFiles(list: FileList | File[] | null): Promise<void> {
  const arr = Array.from(list ?? []).filter(
    f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|avif|svg)$/i.test(f.name)
  )
  if (!arr.length) { showToast('没有识别到图片文件'); return }

  let ok = 0
  for (const f of arr) {
    try {
      const dec = await decodeImage(f)
      store.files.push({
        id: Math.random().toString(36).slice(2, 10),
        file: f, name: f.name, size: f.size,
        source: dec.source, width: dec.width, height: dec.height,
        thumb: URL.createObjectURL(f),
        tf: newTf(), _url: dec.url
      })
      ok++
    } catch {
      showToast('无法解码：' + f.name)
    }
  }
  if (!ok) return
  if (!store.activeId) store.activeId = store.files[0].id
  resetCropToFull()
  showToast({ type: 'success', message: `已添加 ${ok} 张图片` })
}

export function removeFile(id: string): void {
  const i = store.files.findIndex(f => f.id === id)
  if (i < 0) return
  const f = store.files[i]
  URL.revokeObjectURL(f.thumb)
  if (f._url) URL.revokeObjectURL(f._url)
  store.files.splice(i, 1)
  if (store.activeId === id) {
    store.activeId = store.files.length ? store.files[Math.max(0, i - 1)].id : null
    resetCropToFull()
  }
}

export function selectFile(id: string): void {
  if (store.activeId === id) return
  store.activeId = id
  loadCropFromFile()
}

export function clearAll(): void {
  store.files.forEach(f => {
    URL.revokeObjectURL(f.thumb)
    if (f._url) URL.revokeObjectURL(f._url)
  })
  store.files = []
  store.activeId = null
  resetCropToFull()
}

/* ---------- 裁剪 ---------- */
export function resetCropToFull(): void {
  const f = activeFile.value
  if (f) f.tf.crop = null
  if (!f) { store.crop.x = store.crop.y = 0; store.crop.w = store.crop.h = 0; return }
  const b = getBaseSize(f)
  store.crop.x = 0; store.crop.y = 0; store.crop.w = b.w; store.crop.h = b.h
}

export function loadCropFromFile(): void {
  const f = activeFile.value
  const b = f ? getBaseSize(f) : { w: 0, h: 0 }
  const c = f?.tf.crop
  if (c && c.w > 0) {
    store.crop.x = c.x; store.crop.y = c.y; store.crop.w = c.w; store.crop.h = c.h
  } else {
    store.crop.x = 0; store.crop.y = 0; store.crop.w = b.w; store.crop.h = b.h
  }
}

/** 把当前裁剪框写回文件（全图时置 null），实时生效 */
export function commitCrop(): void {
  const f = activeFile.value
  if (!f) return
  const b = getBaseSize(f)
  const isFull = store.crop.x <= 0.5 && store.crop.y <= 0.5 &&
    store.crop.w >= b.w - 1 && store.crop.h >= b.h - 1
  f.tf.crop = isFull ? null : { x: store.crop.x, y: store.crop.y, w: store.crop.w, h: store.crop.h }
}

/* ---------- 编辑 ---------- */
export function resetEdit(): void {
  Object.assign(store.edit, defaultEdit())
}

export function applyPreset(p: Preset): void {
  Object.assign(store.edit, p.v)
  showToast(`已应用「${p.name}」`)
}

export function toggleTheme(): void {
  store.theme = store.theme === 'dark' ? 'light' : 'dark'
  lsSet('pf-theme', store.theme)
}

/* ---------- 当前工具的导出配置 ---------- */
export function currentConfig(): OutputConfig {
  const s = store.settings
  switch (store.tool) {
    case 'convert':
      return { format: s.convFormat, quality: s.convQuality, bg: s.convBg, bgMode: s.convBgMode, maxW: 0, maxH: 0, targetBytes: 0 }
    case 'crop':
      return { format: 'auto', quality: s.cropQuality, bg: s.convBg, bgMode: s.convBgMode, maxW: 0, maxH: 0, targetBytes: 0 }
    case 'edit':
      return { format: 'auto', quality: s.quality, bg: s.convBg, bgMode: s.convBgMode, maxW: 0, maxH: 0, targetBytes: 0 }
    default:
      return {
        format: s.outFormat, quality: s.quality, bg: s.convBg, bgMode: s.convBgMode,
        maxW: parseInt(s.maxW, 10) || 0, maxH: parseInt(s.maxH, 10) || 0,
        targetBytes: (s.targetKB || 0) * 1024
      }
  }
}

export function isLosslessCfg(cfg: OutputConfig): boolean {
  return cfg.format === 'image/png' || (cfg.format === 'auto' && activeFile.value?.file.type === 'image/png')
}

export function setTargetKB(v: number): void {
  v = Math.max(0, Math.round(v || 0))
  store.settings.targetKB = clamp(v, 0, 20480)
}

/** 探测浏览器 WebP / AVIF 编码能力 */
export async function detectFormatsAndApply(): Promise<void> {
  store.formats.webp = await detectFormat('image/webp')
  store.formats.avif = await detectFormat('image/avif')
}
