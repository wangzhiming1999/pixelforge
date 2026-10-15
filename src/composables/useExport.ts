import { showLoadingToast, closeToast, showToast } from 'vant'
import { buildOutput, download, outName } from '../core/image'
import { activeFile, currentConfig, store, stats } from '../store'

let busyDepth = 0
function busy(on: boolean, text?: string): void {
  busyDepth = Math.max(0, busyDepth + (on ? 1 : -1))
  if (busyDepth > 0) showLoadingToast({ message: text ?? '处理中…', duration: 0, forbidClick: true })
  else closeToast(true)
}

/** 当前工具配置 → 导出并下载当前图片 */
export async function downloadCurrent(): Promise<void> {
  const file = activeFile.value
  if (!file) { showToast('请先添加图片'); return }
  busy(true, '正在处理…')
  try {
    const cfg = currentConfig()
    const r = await buildOutput(file, store.edit, cfg, store.formats)
    download(r.blob, outName(file, r.type, store.edit))

    if (cfg.targetBytes > 0 && r.blob.size > cfg.targetBytes) {
      showToast(`已压到 ${fmt(r.blob.size)}，无法再小（目标 ${fmt(cfg.targetBytes)}）`)
    }
    file.outSize = { size: r.blob.size, width: r.width, height: r.height }
    file.outTarget = cfg.targetBytes || 0
    showToast({ type: 'success', message: `已导出 ${fmt(r.blob.size)}` })
  } catch (err) {
    console.error(err)
    showToast((err as Error).message || '处理失败')
  } finally {
    while (busyDepth > 0) busy(false)
  }
}

/** 批量：按当前工具设置处理全部文件 */
export async function processAll(): Promise<void> {
  if (!store.files.length) { showToast('文件列表为空'); return }
  const cfg = currentConfig()
  let done = 0
  try {
    for (const f of store.files) {
      busy(true, `批量处理中… (${done + 1}/${store.files.length})`)
      try {
        const r = await buildOutput(f, store.edit, cfg, store.formats)
        download(r.blob, outName(f, r.type, store.edit))
        f.outSize = { size: r.blob.size, width: r.width, height: r.height }
        f.outTarget = cfg.targetBytes || 0
      } catch {
        showToast('失败：' + f.name)
      }
      done++
      while (busyDepth > 0) busy(false)
      await new Promise(r => setTimeout(r, 320))
    }
    showToast({ type: 'success', message: `已处理 ${done} 张，注意浏览器可能只提示保存一次` })
  } finally {
    while (busyDepth > 0) busy(false)
  }
}

function fmt(n: number): string {
  if (n < 1024) return n + ' B'
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1048576).toFixed(2) + ' MB'
}

export { stats }
