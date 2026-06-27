import Canvas from 'drawille'
import blessed from 'neo-blessed'
import os from 'os'
import childProcess from 'child_process'
import { Command } from 'commander'
import { glob } from 'glob'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import cpuPlugin from './sensors/cpu'
import memoryPlugin from './sensors/memory'
import processPlugin from './sensors/process'

process.env.TERM = 'xterm-256color'

const require = createRequire(import.meta.url)
const { version: VERSION } = require('./package.json')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const App = (() => {
  const cli = new Command()
  let themes = ''
  let program = blessed.program()

  const files = glob.sync(path.join(__dirname, 'themes', '*.json'))
  for (let i = 0; i < files.length; i++) {
    const themeName = files[i]
      .replace(path.join(__dirname, 'themes') + path.sep, '')
      .replace('.json', '')
    themes += `${themeName}|`
  }
  themes = themes.slice(0, -1)

  cli
    .option('-t, --theme [name]', `set the neo vtop theme [${themes}]`, 'parallax')
    .option('--no-mouse', 'Disables mouse interactivity')
    .option('--quit-after [seconds]', 'Quits neo vtop after interval', '0')
    .option('--update-interval [milliseconds]', 'Interval between updates', '300')
    .version(VERSION)
    .parse(process.argv)

  interface ChartData {
    chart: any
    height: number
    width: number
    plugin: any
    values: Record<number, number>
    plugins: any
  }

  interface LoadedTheme {
    title: { fg: string }
    footer: { fg: string }
    [key: string]: any
  }

  let screen: any
  const charts: Record<string, ChartData> = {}
  let loadedTheme: LoadedTheme
  const intervals: NodeJS.Timeout[] = []

  let disableTableUpdate = false
  let disableTableUpdateTimeout: NodeJS.Timeout = setTimeout(() => {}, 0)
  let graphScale = 1
  let position = 0

  const size = {
    pixel: { width: 0, height: 0 },
    character: { width: 0, height: 0 },
  }

  let graph: any
  let graph2: any
  let processList: any
  let processListSelection: any
  const sensorMap: Record<string, any> = {
    cpu: cpuPlugin,
    memory: memoryPlugin,
    process: processPlugin,
  }

  const drawHeader = () => {
    const headerText = ` {bold}neo vtop{/bold}{white-fg} for ${os.hostname()} `
    const headerTextNoTags = ` neo vtop for ${os.hostname()} `

    const header = blessed.text({
      top: 'top',
      left: 'left',
      width: headerTextNoTags.length,
      height: '1',
      fg: loadedTheme.title.fg,
      content: headerText,
      tags: true,
    })
    const date = blessed.text({
      top: 'top',
      right: 0,
      width: 9,
      height: '1',
      align: 'right',
      content: '',
      tags: true,
    })
    const loadAverage = blessed.text({
      top: 'top',
      height: '1',
      align: 'center',
      content: '',
      tags: true,
      left: Math.floor(program.cols / 2 - 28 / 2),
    })
    screen.append(header)
    screen.append(date)
    screen.append(loadAverage)

    const zeroPad = (input: number) => `0${input}`.slice(-2)

    const updateTime = () => {
      const time = new Date()
      date.setContent(
        `${zeroPad(time.getHours())}:${zeroPad(time.getMinutes())}:${zeroPad(time.getSeconds())} `,
      )
      screen.render()
    }

    const updateLoadAverage = () => {
      const avg = os.loadavg()
      loadAverage.setContent(
        `Load Average: ${avg[0].toFixed(2)} ${avg[1].toFixed(2)} ${avg[2].toFixed(2)}`,
      )
      screen.render()
    }

    updateTime()
    updateLoadAverage()
    setInterval(updateTime, 1000)
    setInterval(updateLoadAverage, 1000)
  }

  const drawFooter = () => {
    const commands: Record<string, string> = {
      dd: 'Kill process',
      j: 'Down',
      k: 'Up',
      g: 'Jump to top',
      G: 'Jump to bottom',
      c: 'Sort by CPU',
      m: 'Sort by Mem',
    }
    let text = ''
    for (const c in commands) {
      text += `  {white-bg}{black-fg}${c}{/black-fg}{/white-bg} ${commands[c]}`
    }
    text += '{|}https://github.com/nexusocean8/neo-vtop'
    const footerRight = blessed.box({
      width: '100%',
      top: program.rows - 1,
      tags: true,
      fg: loadedTheme.footer.fg,
    })
    footerRight.setContent(text)
    screen.append(footerRight)
  }

  const stringRepeat = (string: string, num: number): string => {
    if (num < 0) return ''
    return new Array(num + 1).join(string)
  }

  const drawChart = (chartKey: string) => {
    const chart = charts[chartKey]
    const c = chart.chart
    c.clear()

    if (!chart.plugin.initialized) return false

    const dataPointsToKeep = 5000
    charts[chartKey].values[position] = chart.plugin.currentValue

    const computeValue = (input: number) =>
      chart.height - Math.floor(((chart.height + 1) / 100) * input) - 1

    if (position > dataPointsToKeep) {
      delete charts[chartKey].values[position - dataPointsToKeep]
    }

    for (const pos in charts[chartKey].values) {
      const posInt = parseInt(pos, 10)

      if (graphScale >= 1 || (graphScale < 1 && posInt % (1 / graphScale) === 0)) {
        const p = posInt + (chart.width - Object.keys(charts[chartKey].values).length)
        const x = p * graphScale + (1 - graphScale) * chart.width

        if (p > 1 && computeValue(charts[chartKey].values[posInt - 1]) > 0) {
          c.set(x, computeValue(charts[chartKey].values[posInt - 1]))
        }

        for (let y = computeValue(charts[chartKey].values[posInt - 1]); y < chart.height; y++) {
          if (graphScale > 1 && p > 0 && y > 0) {
            const current = computeValue(charts[chartKey].values[posInt - 1])
            const next = computeValue(charts[chartKey].values[posInt])
            const diff = (next - current) / graphScale

            for (let i = 0; i < graphScale; i++) {
              c.set(x + i, y + diff * i)
              for (let j = y + diff * i; j < chart.height; j++) {
                c.set(x + i, j)
              }
            }
          } else if (graphScale <= 1) {
            c.set(x, y)
          }
        }
      }
    }

    const textOutput = c.frame().split('\n')
    const percent = `   ${chart.plugin.currentValue}`
    textOutput[0] = `${textOutput[0].slice(0, textOutput[0].length - 4)}{white-fg}${percent.slice(-3)}%{/white-fg}`

    return textOutput.join('\n')
  }

  const drawTable = (chartKey: string) => {
    const chart = charts[chartKey]
    const columnLengths: Record<string, number> = {}
    const columns: string[] = chart.plugin.columns.slice(0)
    columns.reverse()
    let removeColumn = false
    const lastItem = columns[columns.length - 1]

    const minimumWidth = 12
    let padding = 1
    if (chart.width > 50) padding = 2
    if (chart.width > 80) padding = 3

    do {
      let totalUsed = 0
      let firstLength = 0
      for (const column in columns) {
        const item = columns[column]
        if (item === lastItem) {
          columnLengths[item] = chart.width - totalUsed
          firstLength = columnLengths[item]
        } else {
          columnLengths[item] = item.length + padding
        }
        totalUsed += columnLengths[item]
      }
      if (firstLength < minimumWidth && columns.length > 1) {
        columns.shift()
        removeColumn = true
      } else {
        removeColumn = false
      }
    } while (removeColumn)

    columns.reverse()
    let titleOutput = '{bold}'
    for (const headerColumn in columns) {
      const colText = ` ${columns[headerColumn]}`
      titleOutput +=
        colText + stringRepeat(' ', columnLengths[columns[headerColumn]] - colText.length)
    }
    titleOutput += '{/bold}\n'

    const bodyOutput: string[] = []
    for (const row in chart.plugin.currentValue) {
      const currentRow = chart.plugin.currentValue[row]
      let rowText = ''
      for (const bodyColumn in columns) {
        const colText = ` ${currentRow[columns[bodyColumn]]}`
        rowText += (
          colText + stringRepeat(' ', columnLengths[columns[bodyColumn]] - colText.length)
        ).slice(0, columnLengths[columns[bodyColumn]])
      }
      bodyOutput.push(rowText)
    }
    return {
      title: titleOutput,
      body: bodyOutput,
      processWidth: columnLengths[columns[0]],
    }
  }

  let currentItems: string[] = []
  let processWidth = 0

  const draw = () => {
    position++

    graph.setContent(drawChart('0'))
    graph2.setContent(drawChart('1'))

    if (!disableTableUpdate) {
      const table = drawTable('2')
      processList.setContent(table.title)

      const existingStats: Record<string, string> = {}
      for (const stat in currentItems) {
        const thisStat = currentItems[stat]
        existingStats[thisStat.slice(0, table.processWidth)] = thisStat
      }
      processWidth = table.processWidth

      processListSelection.setItems(table.body)
      processListSelection.focus()
      currentItems = table.body
    }

    screen.render()
  }

  return {
    init() {
      const theme = (process as any).theme ?? cli.opts().theme

      if (cli.opts()['quitAfter'] !== '0') {
        setTimeout(() => process.exit(0), parseInt(cli.opts()['quitAfter'], 10) * 1000)
      }

      try {
        loadedTheme = require(`./themes/${theme}.json`)
      } catch {
        console.log(`The theme '${theme}' does not exist.`)
        process.exit(1)
      }

      screen = blessed.screen()

      let lastKey = ''

      screen.on('keypress', (ch: any, key: any) => {
        if (['up', 'down', 'k', 'j'].includes(key.name)) {
          disableTableUpdate = true
          clearTimeout(disableTableUpdateTimeout)
          disableTableUpdateTimeout = setTimeout(() => {
            disableTableUpdate = false
          }, 1000)
        }

        if (key.name === 'q' || key.name === 'escape' || (key.name === 'c' && key.ctrl)) {
          return process.exit(0)
        }

        if (lastKey === 'd' && key.name === 'd') {
          let selectedProcess = processListSelection.getItem(processListSelection.selected).content
          selectedProcess = selectedProcess.slice(0, processWidth).trim()
          childProcess.exec(`killall "${selectedProcess}"`, () => {})
        }

        if (key.name === 'c' && charts['2'].plugin.sort !== 'cpu') {
          charts['2'].plugin.sort = 'cpu'
          charts['2'].plugin.poll()
          setTimeout(() => processListSelection.select(0), 200)
        }

        if (key.name === 'm' && charts['2'].plugin.sort !== 'mem') {
          charts['2'].plugin.sort = 'mem'
          charts['2'].plugin.poll()
          setTimeout(() => processListSelection.select(0), 200)
        }

        if ((key.name === 'left' || key.name === 'h') && graphScale < 8) {
          graphScale *= 2
        } else if ((key.name === 'right' || key.name === 'l') && graphScale > 0.125) {
          graphScale /= 2
        }

        lastKey = key.name
      })

      drawHeader()
      drawFooter()

      graph = blessed.box({
        top: 1,
        left: 'left',
        width: '100%',
        height: '50%',
        content: '',
        fg: loadedTheme.chart.fg,
        tags: true,
        border: loadedTheme.chart.border,
      })
      screen.append(graph)

      let graph2appended = false

      const createBottom = () => {
        if (graph2appended) {
          screen.remove(graph2)
          screen.remove(processList)
        }
        graph2appended = true

        graph2 = blessed.box({
          top: graph.height + 1,
          left: 'left',
          width: '50%',
          height: graph.height - 2,
          content: '',
          fg: loadedTheme.chart.fg,
          tags: true,
          border: loadedTheme.chart.border,
        })
        screen.append(graph2)

        processList = blessed.box({
          top: graph.height + 1,
          left: '50%',
          width: screen.width - graph2.width,
          height: graph.height - 2,
          keys: true,
          mouse: cli.opts().mouse,
          fg: loadedTheme.table.fg,
          tags: true,
          border: loadedTheme.table.border,
        })
        screen.append(processList)

        processListSelection = blessed.list({
          height: processList.height - 3,
          top: 1,
          width: processList.width - 2,
          left: 0,
          keys: true,
          vi: true,
          style: loadedTheme.table.items,
          mouse: cli.opts().mouse,
        })
        processList.append(processListSelection)
        processListSelection.focus()
        screen.render()
      }

      screen.on('resize', createBottom)
      createBottom()
      screen.append(graph)
      screen.append(processList)
      screen.render()

      const plugins = ['cpu', 'memory', 'process']

      const setupCharts = () => {
        size.pixel.width = (graph.width - 2) * 2
        size.pixel.height = (graph.height - 2) * 4

        plugins.forEach((plugin, index) => {
          let width: number
          let height: number
          let currentCanvas: any

          switch (plugin) {
            case 'cpu':
              width = (graph.width - 3) * 2
              height = (graph.height - 2) * 4
              currentCanvas = new Canvas(width, height)
              break
            case 'memory':
              width = (graph2.width - 3) * 2
              height = (graph2.height - 2) * 4
              currentCanvas = new Canvas(width, height)
              break
            case 'process':
            default:
              width = processList.width - 3
              height = processList.height - 2
              break
          }

          const key = String(index)
          const values = charts[key]?.values ?? {}

          charts[key] = {
            chart: currentCanvas,
            values,
            plugin: sensorMap[plugin],
            plugins,
            width,
            height,
          }
          charts[key].plugin.poll()
        })

        graph.setLabel(` ${charts['0'].plugin.title} `)
        graph2.setLabel(` ${charts['1'].plugin.title} `)
        processList.setLabel(` ${charts['2'].plugin.title} `)
      }

      setupCharts()
      screen.on('resize', setupCharts)
      intervals.push(setInterval(draw, parseInt(cli.opts()['updateInterval'], 10)))
      intervals.push(setInterval(charts['0'].plugin.poll, charts['0'].plugin.interval))
      intervals.push(setInterval(charts['1'].plugin.poll, charts['1'].plugin.interval))
      intervals.push(setInterval(charts['2'].plugin.poll, charts['2'].plugin.interval))
    },
  }
})()

App.init()
