// os-utils
declare module 'os-utils' {
  function cpuUsage(callback: (value: number) => void): void
  function freememPercentage(): number
  function totalmem(): number
}

// neo-blessed
declare module 'neo-blessed' {
  const blessed: any
  export default blessed
}

// drawille
declare module 'drawille' {
  class Canvas {
    constructor(width: number, height: number)
    clear(): void
    set(x: number, y: number): void
    frame(): string
  }
  export default Canvas
}
