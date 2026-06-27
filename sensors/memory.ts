/**
 * Memory Usage sensor
 *
 * (c) 2014 James Hall
 */
import os from 'os-utils'
import _os from 'os'
import child from 'child_process'

interface MemoryPlugin {
  title: string
  type: string
  interval: number
  initialized: boolean
  currentValue: number
  isLinux: boolean
  isMac: boolean
  poll: () => void
}

const computeUsage = (used: number, total: number): number => Math.round(100 * (used / total))

const plugin: MemoryPlugin = {
  title: 'Memory Usage',
  type: 'chart',
  interval: 200,
  initialized: false,
  currentValue: 0,
  isLinux: _os.platform().includes('linux'),
  isMac: _os.platform().includes('darwin'),

  poll() {
    if (plugin.isLinux) {
      child.exec('free -m', (err, stdout) => {
        if (err) console.error(err)
        const data = stdout
          .split('\n')[1]
          .replace(/[\s\n\r]+/g, ' ')
          .split(' ')
        const used = parseInt(data[2], 10)
        const total = parseInt(data[1], 10)
        plugin.currentValue = computeUsage(used, total)
      })
    } else if (plugin.isMac) {
      child.exec('ps -caxm -orss,comm', (err, stdout) => {
        if (err) throw err
        const sp = stdout.split('\n')
        let total = 0
        for (let i = 0; i < sp.length; i++) {
          const val = parseInt(sp[i].replace(/([a-zA-Z]).*/, ''))
          if (!isNaN(val)) total += val
        }
        const usedmem = total / 1024 ** 2
        const freemem = (os as any).totalmem() - usedmem
        const per = freemem / (os as any).totalmem()
        plugin.currentValue = Math.round((1 - per) * 100)
      })
    } else {
      plugin.currentValue = Math.round((1 - (os as any).freememPercentage()) * 100)
    }

    plugin.initialized = true
  },
}

export default plugin
