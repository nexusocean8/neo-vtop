/**
 *
 * Process monitor sensor
 *
 * (c) 2014 James Hall
 */
import os from 'os'
import childProcess from 'child_process'

interface ProcessStat {
  cpu: number | string
  mem: number | string
  comm: string
  count: number
}

interface ProcessRow {
  Command: string
  Count: number
  'CPU %': string
  'Memory %': string
  cpu: number | string
  mem: number | string
}

const plugin = {
  title: 'Process List',
  description: `
    This returns a process list, grouped by executable name. CPU % is divided by the number of cores.
    100% CPU Usage is all cores being maxed out.`,
  type: 'table',
  interval: 2000,
  initialized: false,
  sort: 'cpu',
  columns: ['Command', 'CPU %', 'Count', 'Memory %'],
  currentValue: [] as ProcessRow[],

  poll() {
    const stats: Record<string, ProcessStat> = {}
    childProcess.exec('ps -ewwwo %cpu,%mem,comm', (error, stdout) => {
      if (error) {
        console.error(error)
      }
      const lines = stdout.split('\n')
      lines[0] = ''
      for (const line in lines) {
        const currentLine = lines[line].trim().replace('  ', ' ')
        const words = currentLine.split(' ')
        if (typeof words[0] !== 'undefined' && typeof words[1] !== 'undefined') {
          const cpu = words[0].replace(',', '.')
          const mem = words[1].replace(',', '.')
          const offset = cpu.length + mem.length + 2
          let comm = currentLine.slice(offset)
          if (/^darwin/.test(process.platform)) {
            comm = comm.split('/').at(-1) ?? comm
          } else {
            comm = comm.split('/')[0]
          }
          if (typeof stats[comm] !== 'undefined') {
            stats[comm] = {
              cpu: parseFloat(String(stats[comm].cpu)) + parseFloat(cpu),
              mem: parseFloat(String(stats[comm].mem)) + parseFloat(mem),
              comm,
              count: stats[comm].count + 1,
            }
          } else {
            stats[comm] = { cpu, mem, comm, count: 1 }
          }
        }
      }
      const statsArray: ProcessRow[] = []
      for (const stat in stats) {
        const cpuRounded = (parseFloat(String(stats[stat].cpu)) / os.cpus().length).toFixed(1)
        const memRounded = parseFloat(String(stats[stat].mem)).toFixed(1)
        statsArray.push({
          Command: stats[stat].comm,
          Count: stats[stat].count,
          'CPU %': cpuRounded,
          'Memory %': memRounded,
          cpu: stats[stat].cpu,
          mem: stats[stat].mem,
        })
      }
      statsArray.sort(
        (a, b) =>
          parseFloat(String(b[plugin.sort as keyof ProcessRow])) -
          parseFloat(String(a[plugin.sort as keyof ProcessRow])),
      )

      plugin.currentValue = statsArray
      plugin.initialized = true
    })
  },
}

export default plugin
