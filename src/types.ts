export interface Crop {
  x: number
  y: number
  w: number
  h: number
}

export interface Tf {
  rotate: number // 0 / 90 / 180 / 270
  flipH: boolean
  flipV: boolean
  crop: Crop | null
}

export function newTf(): Tf {
  return { rotate: 0, flipH: false, flipV: false, crop: null }
}

export type ImgSource = ImageBitmap | HTMLImageElement

export interface Watermark {
  text: string
  color: string
  pos: 'tl' | 'tc' | 'tr' | 'bl' | 'bc' | 'br' | 'cc'
  size: number // 相对宽度百分比
  opacity: number // 5 - 100
}

export interface Edit {
  brightness: number
  contrast: number
  saturate: number
  hue: number
  blur: number
  sharpen: number
  grayscale: number
  sepia: number
  invert: number
  radius: number
  wm: Watermark
}

export function defaultEdit(): Edit {
  return {
    brightness: 100, contrast: 100, saturate: 100, hue: 0,
    blur: 0, sharpen: 0, grayscale: 0, sepia: 0, invert: 0, radius: 0,
    wm: { text: '', color: '#ffffff', pos: 'br', size: 4, opacity: 60 }
  }
}

export interface ImgFile {
  id: string
  file: File
  name: string
  size: number
  source: ImgSource
  width: number
  height: number
  thumb: string
  tf: Tf
  outSize?: { size: number; width: number; height: number }
  outTarget?: number
  _url?: string
}

export interface OutputConfig {
  format: string // MIME，'auto' 跟随原格式
  quality: number // 0.05 - 1
  bg: string
  bgMode: 'auto' | 'always' | 'never'
  maxW: number
  maxH: number
  targetBytes: number
}

export interface OutputResult {
  blob: Blob
  type: string
  width: number
  height: number
}

export const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/avif': 'avif', 'image/gif': 'gif', 'image/bmp': 'bmp'
}

export interface Preset {
  name: string
  v: Pick<Edit, 'brightness' | 'contrast' | 'saturate' | 'hue' | 'grayscale' | 'sepia' | 'invert'>
}

export const PRESETS: Preset[] = [
  { name: '原图',   v: { brightness: 100, contrast: 100, saturate: 100, hue: 0,   grayscale: 0,   sepia: 0,  invert: 0 } },
  { name: '通透',   v: { brightness: 106, contrast: 112, saturate: 118, hue: 0,   grayscale: 0,   sepia: 0,  invert: 0 } },
  { name: '暖阳',   v: { brightness: 105, contrast: 104, saturate: 122, hue: 8,   grayscale: 0,   sepia: 18, invert: 0 } },
  { name: '冷冽',   v: { brightness: 100, contrast: 110, saturate: 92,  hue: -12, grayscale: 0,   sepia: 0,  invert: 0 } },
  { name: '胶片',   v: { brightness: 98,  contrast: 118, saturate: 82,  hue: 4,   grayscale: 0,   sepia: 24, invert: 0 } },
  { name: '暗调',   v: { brightness: 88,  contrast: 126, saturate: 96,  hue: 0,   grayscale: 0,   sepia: 0,  invert: 0 } },
  { name: '黑白',   v: { brightness: 102, contrast: 116, saturate: 100, hue: 0,   grayscale: 100, sepia: 0,  invert: 0 } },
  { name: '褪色',   v: { brightness: 108, contrast: 86,  saturate: 70,  hue: 0,   grayscale: 22,  sepia: 12, invert: 0 } },
  { name: '高反差', v: { brightness: 96,  contrast: 160, saturate: 110, hue: 0,   grayscale: 0,   sepia: 0,  invert: 0 } },
  { name: '反色',   v: { brightness: 100, contrast: 100, saturate: 100, hue: 0,   grayscale: 0,   sepia: 0,  invert: 100 } }
]
