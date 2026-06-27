#!/usr/bin/env node
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

spawnSync(process.execPath, ['--import=tsx/esm', join(__dirname, '../app.js')], {
  stdio: 'inherit',
  env: process.env,
})
