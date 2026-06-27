#!/usr/bin/env node
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tsx = join(__dirname, '../node_modules/tsx/dist/esm/index.cjs')

spawnSync(process.execPath, [`--import=${tsx}`, join(__dirname, '../app.js')], {
  stdio: 'inherit',
  env: process.env,
})
