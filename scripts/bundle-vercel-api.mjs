import { mkdirSync, readdirSync, renameSync, existsSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const esbuild = require('esbuild')

const root = fileURLToPath(new URL('..', import.meta.url))
const apiRoot = join(root, 'api')

function listTs(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...listTs(full))
    else if (name.endsWith('.ts')) out.push(full)
  }
  return out
}

const entries = listTs(apiRoot)
if (entries.length === 0) {
  console.log('No API TypeScript entries to bundle')
  process.exit(0)
}

for (const src of entries) {
  const outfile = src.replace(/\.ts$/, '.js')
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: [src],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    logLevel: 'info',
    legalComments: 'none',
  })
  const bak = `${src}.bak`
  if (existsSync(bak)) {
    throw new Error(`Backup already exists: ${relative(root, bak)}`)
  }
  mkdirSync(dirname(outfile), { recursive: true })
  renameSync(src, bak)
  console.log(`bundled ${relative(root, src)} -> ${relative(root, outfile)}`)
}
