export interface WoodTextureOptions {
  width?: number
  height?: number
  baseColor?: string
  grainColor?: string
  grainDensity?: number
  seed?: number
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

export function generateWoodTexture(opts: WoodTextureOptions = {}): HTMLCanvasElement {
  const {
    width = 256,
    height = 256,
    baseColor = '#c49358',
    grainColor = '#8B6914',
    grainDensity = 12,
    seed = Math.floor(Math.random() * 100000),
  } = opts

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const rand = seededRandom(seed)

  // Base fill
  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, width, height)

  // Grain lines
  for (let i = 0; i < grainDensity; i++) {
    const y = rand() * height
    const amplitude = 2 + rand() * 4
    const frequency = 0.01 + rand() * 0.03
    const alpha = 0.08 + rand() * 0.15
    const lineWidth = 1 + rand() * 2

    ctx.strokeStyle = grainColor
    ctx.globalAlpha = alpha
    ctx.lineWidth = lineWidth
    ctx.beginPath()

    for (let x = 0; x <= width; x += 2) {
      const dy = Math.sin(x * frequency + i) * amplitude
      if (x === 0) ctx.moveTo(x, y + dy)
      else ctx.lineTo(x, y + dy)
    }
    ctx.stroke()
  }

  // Subtle noise overlay
  ctx.globalAlpha = 0.04
  for (let i = 0; i < 200; i++) {
    const x = rand() * width
    const y = rand() * height
    const size = 1 + rand() * 3
    ctx.fillStyle = rand() > 0.5 ? '#000' : '#fff'
    ctx.fillRect(x, y, size, size)
  }

  ctx.globalAlpha = 1
  return canvas
}

export interface PlywoodTextureOptions {
  width?: number
  height?: number
  baseColor?: string
  layerCount?: number
  seed?: number
}

export function generatePlywoodTexture(opts: PlywoodTextureOptions = {}): HTMLCanvasElement {
  const {
    width = 256,
    height = 256,
    baseColor = '#ddb758',
    layerCount = 4,
    seed = Math.floor(Math.random() * 100000),
  } = opts

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const rand = seededRandom(seed)

  // Base fill
  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, width, height)

  // Horizontal layer lines
  const layerHeight = height / layerCount
  for (let i = 0; i < layerCount; i++) {
    const y = i * layerHeight
    ctx.strokeStyle = '#a07830'
    ctx.globalAlpha = 0.2 + rand() * 0.1
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y + (rand() - 0.5) * 3)
    ctx.stroke()
  }

  // Vertical grain within layers
  for (let layer = 0; layer < layerCount; layer++) {
    const layerY = layer * layerHeight
    for (let g = 0; g < 6; g++) {
      const x = rand() * width
      ctx.strokeStyle = '#8B6914'
      ctx.globalAlpha = 0.06 + rand() * 0.1
      ctx.lineWidth = 0.5 + rand() * 1.5
      ctx.beginPath()
      for (let y = layerY; y < layerY + layerHeight; y += 3) {
        const dx = Math.sin(y * 0.05 + g) * 2
        if (y === layerY) ctx.moveTo(x + dx, y)
        else ctx.lineTo(x + dx, y)
      }
      ctx.stroke()
    }
  }

  ctx.globalAlpha = 1
  return canvas
}
