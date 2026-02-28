/**
 * Copy onnxruntime-web WASM files to public/ so they're accessible in Worker context.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const ortDist = join(root, 'node_modules', 'onnxruntime-web', 'dist')
const publicDir = join(root, 'public')

if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true })
}

const files = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
]

for (const file of files) {
  const src = join(ortDist, file)
  const dest = join(publicDir, file)
  if (existsSync(src)) {
    copyFileSync(src, dest)
    console.log(`Copied ${file} to public/`)
  }
}
