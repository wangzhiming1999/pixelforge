import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from '@vant/auto-import-resolver'

export default defineConfig({
  base: './', // 兼容 GitHub Pages 项目页子路径 /pixelforge/
  plugins: [
    vue(),
    Components({ resolvers: [VantResolver()] })
  ],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900
  }
})
