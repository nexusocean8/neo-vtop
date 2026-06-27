/**
 * CPU Usage sensor
 *
 * (c) 2014 James Hall
 */

import os from 'os-utils'

interface CpuPlugin {
  title: string
  type: string
  interval: number
  initialized: boolean
  currentValue: number
  poll: () => void
}

const plugin: CpuPlugin = {
  title: 'CPU Usage',
  type: 'chart',
  interval: 200,
  initialized: false,
  currentValue: 0,

  poll() {
    ;(os as any).cpuUsage((v: number) => {
      plugin.currentValue = Math.floor(v * 100)
      plugin.initialized = true
    })
  },
}

export default plugin
