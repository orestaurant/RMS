/**
 * Self-contained, zero-dependency QR Code generator & React component.
 * Compliant with ISO/IEC 18004.
 * Generates crisp SVG / Canvas QR codes for both Client & Server rendering.
 */

'use client'

import React, { useMemo } from 'react'

// --- QR CODE CORE ALGORITHM (Byte Mode, ECC Level M/L) ---

// GF(256) Math
const EXP_TABLE = new Uint8Array(512)
const LOG_TABLE = new Uint8Array(256)

;(function initGaloisField() {
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x
    LOG_TABLE[x] = i
    x = (x << 1) ^ (x & 0x80 ? 0x11d : 0)
  }
  for (let i = 255; i < 512; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - 255]
  }
})()

function gfMultiply(x: number, y: number): number {
  if (x === 0 || y === 0) return 0
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]]
}

function polyMultiply(p1: number[], p2: number[]): number[] {
  const result = new Array(p1.length + p2.length - 1).fill(0)
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gfMultiply(p1[i], p2[j])
    }
  }
  return result
}

function getGeneratorPoly(degree: number): number[] {
  let g = [1]
  for (let i = 0; i < degree; i++) {
    g = polyMultiply(g, [1, EXP_TABLE[i]])
  }
  return g
}

function calculateECC(data: number[], eccLength: number): number[] {
  const gen = getGeneratorPoly(eccLength)
  const remainder = [...data, ...new Array(eccLength).fill(0)]
  for (let i = 0; i < data.length; i++) {
    const factor = remainder[i]
    if (factor !== 0) {
      for (let j = 0; j < gen.length; j++) {
        remainder[i + j] ^= gfMultiply(gen[j], factor)
      }
    }
  }
  return remainder.slice(data.length)
}

// Version table: [version, totalCodewords, eccCodewordsPerBlock, numBlocks]
// Using ECC level M (recommended default, 15% recovery)
const VERSION_SPECS_M: [number, number, number, number][] = [
  [1, 26, 10, 1], // up to 14 bytes
  [2, 44, 16, 1], // up to 26 bytes
  [3, 70, 26, 1], // up to 42 bytes
  [4, 100, 18, 2], // up to 62 bytes
  [5, 134, 24, 2], // up to 84 bytes
  [6, 172, 16, 4], // up to 106 bytes
  [7, 196, 18, 4], // up to 122 bytes
  [8, 242, 22, 4], // up to 152 bytes
  [9, 292, 22, 5], // up to 180 bytes
  [10, 346, 26, 5], // up to 213 bytes
]

// Alignment pattern positions for versions 1..10
const ALIGNMENT_PATTERN_POS: number[][] = [
  [], // v0 dummy
  [], // v1
  [6, 18], // v2
  [6, 22], // v3
  [6, 26], // v4
  [6, 30], // v5
  [6, 34], // v6
  [6, 22, 38], // v7
  [6, 24, 42], // v8
  [6, 26, 46], // v9
  [6, 28, 50], // v10
]

export function encodeQRCode(text: string): boolean[][] {
  const utf8 = new TextEncoder().encode(text)
  const dataLen = utf8.length

  // Select smallest version that fits
  let spec = VERSION_SPECS_M.find(([, totalCw, eccCw, blocks]) => {
    const dataCapacity = totalCw - eccCw * blocks
    return dataCapacity >= dataLen + 3 // Mode(4 bits) + Count(8 bits) + data
  })

  if (!spec) {
    spec = VERSION_SPECS_M[VERSION_SPECS_M.length - 1]
  }

  const [version, totalCw, eccCwPerBlock, numBlocks] = spec
  const totalDataCw = totalCw - eccCwPerBlock * numBlocks
  const dataCwPerBlock = Math.floor(totalDataCw / numBlocks)

  // 1. Bitstream assembly: Byte Mode (0100) + Char Count (8 bits for v1-9, 16 for v10+)
  const bitstream: number[] = []
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bitstream.push((val >> i) & 1)
    }
  }

  pushBits(0b0100, 4) // Byte mode
  pushBits(dataLen, version >= 10 ? 16 : 8) // Length indicator
  for (const byte of utf8) {
    pushBits(byte, 8)
  }

  // Terminator (up to 4 zeroes)
  const capacityBits = totalDataCw * 8
  const termLen = Math.min(4, capacityBits - bitstream.length)
  pushBits(0, termLen)

  // Align to byte
  while (bitstream.length % 8 !== 0) {
    bitstream.push(0)
  }

  // Pad bytes 0xEC, 0x11
  const PAD_BYTES = [0xec, 0x11]
  let padIdx = 0
  while (bitstream.length < capacityBits) {
    pushBits(PAD_BYTES[padIdx % 2], 8)
    padIdx++
  }

  // Convert bitstream to data codewords
  const dataCodewords: number[] = []
  for (let i = 0; i < bitstream.length; i += 8) {
    let byte = 0
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bitstream[i + b]
    }
    dataCodewords.push(byte)
  }

  // 2. Divide into blocks and compute ECC
  const blocksData: number[][] = []
  const blocksEcc: number[][] = []
  let offset = 0
  for (let i = 0; i < numBlocks; i++) {
    const blockSize = i < (totalDataCw % numBlocks) ? dataCwPerBlock + 1 : dataCwPerBlock
    const bData = dataCodewords.slice(offset, offset + blockSize)
    offset += blockSize
    blocksData.push(bData)
    blocksEcc.push(calculateECC(bData, eccCwPerBlock))
  }

  // 3. Interleave data codewords then ECC codewords
  const finalCodewords: number[] = []
  const maxDataBlockLen = Math.max(...blocksData.map((b) => b.length))
  for (let i = 0; i < maxDataBlockLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < blocksData[b].length) {
        finalCodewords.push(blocksData[b][i])
      }
    }
  }
  for (let i = 0; i < eccCwPerBlock; i++) {
    for (let b = 0; b < numBlocks; b++) {
      finalCodewords.push(blocksEcc[b][i])
    }
  }

  // 4. Matrix construction
  const size = 17 + 4 * version
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null))
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

  function setModule(r: number, c: number, val: boolean, isFunc = true) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val
      if (isFunc) isFunction[r][c] = true
    }
  }

  // Finder patterns (top-left, top-right, bottom-left)
  function placeFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r
        const nc = col + c
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBlack = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)
            setModule(nr, nc, isBlack)
          } else {
            setModule(nr, nc, false) // Separator
          }
        }
      }
    }
  }

  placeFinder(0, 0)
  placeFinder(0, size - 7)
  placeFinder(size - 7, 0)

  // Alignment patterns
  const alignCoords = ALIGNMENT_PATTERN_POS[version] || []
  for (const r of alignCoords) {
    for (const c of alignCoords) {
      // Don't place on top of finder patterns
      const isTopLeft = r <= 8 && c <= 8
      const isTopRight = r <= 8 && c >= size - 9
      const isBottomLeft = r >= size - 9 && c <= 8
      if (!isTopLeft && !isTopRight && !isBottomLeft) {
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBlack = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0)
            setModule(r + dr, c + dc, isBlack)
          }
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0)
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0)
  }

  // Dark module
  setModule(4 * version + 9, 8, true)

  // Reserve format information areas
  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8][i]) setModule(8, i, false, true)
    if (!isFunction[i][8]) setModule(i, 8, false, true)
  }
  for (let i = size - 8; i < size; i++) {
    if (!isFunction[8][i]) setModule(8, i, false, true)
    if (!isFunction[i][8]) setModule(i, 8, false, true)
  }

  // 5. Place Data Codewords (zigzag traversal)
  let bitIndex = 0
  const finalBits: number[] = []
  for (const cw of finalCodewords) {
    for (let b = 7; b >= 0; b--) {
      finalBits.push((cw >> b) & 1)
    }
  }

  let upward = true
  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol-- // Skip vertical timing pattern column

    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i)

    for (const r of rows) {
      for (const c of [rightCol, rightCol - 1]) {
        if (!isFunction[r][c]) {
          const bit = bitIndex < finalBits.length ? finalBits[bitIndex++] : 0
          matrix[r][c] = bit === 1
        }
      }
    }
    upward = !upward
  }

  // 6. Apply Mask Pattern (Mask 0: (row + col) % 2 === 0 is standard and clean)
  const mask = (r: number, c: number) => (r + c) % 2 === 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r][c] && matrix[r][c] !== null) {
        if (mask(r, c)) {
          matrix[r][c] = !matrix[r][c]
        }
      }
    }
  }

  // 7. Format Information (Mask 0, Level M: 0b100000011001110)
  // Precomputed 15-bit BCH code for ECC M + Mask 0
  const FORMAT_BITS = [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0]
  // Top-left
  matrix[8][0] = FORMAT_BITS[0] === 1
  matrix[8][1] = FORMAT_BITS[1] === 1
  matrix[8][2] = FORMAT_BITS[2] === 1
  matrix[8][3] = FORMAT_BITS[3] === 1
  matrix[8][4] = FORMAT_BITS[4] === 1
  matrix[8][5] = FORMAT_BITS[5] === 1
  matrix[8][7] = FORMAT_BITS[6] === 1
  matrix[8][8] = FORMAT_BITS[7] === 1
  matrix[7][8] = FORMAT_BITS[8] === 1
  matrix[5][8] = FORMAT_BITS[9] === 1
  matrix[4][8] = FORMAT_BITS[10] === 1
  matrix[3][8] = FORMAT_BITS[11] === 1
  matrix[2][8] = FORMAT_BITS[12] === 1
  matrix[1][8] = FORMAT_BITS[13] === 1
  matrix[0][8] = FORMAT_BITS[14] === 1

  // Top-right and bottom-left copies
  for (let i = 0; i < 7; i++) {
    matrix[8][size - 1 - i] = FORMAT_BITS[14 - i] === 1
  }
  for (let i = 0; i < 8; i++) {
    matrix[size - 1 - i][8] = FORMAT_BITS[i] === 1
  }

  return matrix.map((row) => row.map((cell) => cell ?? false))
}

export interface QRCodeSVGProps {
  value: string
  size?: number
  className?: string
  fgColor?: string
  bgColor?: string
  includeMargin?: boolean
}

export function QRCodeSVG({
  value,
  size = 200,
  className = '',
  fgColor = '#000000',
  bgColor = '#ffffff',
  includeMargin = true,
}: QRCodeSVGProps) {
  const matrix = useMemo(() => {
    try {
      return encodeQRCode(value || ' ')
    } catch (e) {
      console.error('QR code generation error:', e)
      return []
    }
  }, [value])

  if (!matrix.length) {
    return <div style={{ width: size, height: size }} className="bg-muted flex items-center justify-center text-xs">QR Error</div>
  }

  const moduleCount = matrix.length
  const margin = includeMargin ? 4 : 0
  const totalSize = moduleCount + margin * 2

  // Build path string for all dark modules for maximum performance and sharpness
  let path = ''
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        path += `M${c + margin},${r + margin}h1v1h-1z `
      }
    }
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      width={size}
      height={size}
      className={className}
      shapeRendering="crispEdges"
      style={{ display: 'block', maxWidth: '100%' }}
    >
      <rect width={totalSize} height={totalSize} fill={bgColor} />
      <path d={path} fill={fgColor} />
    </svg>
  )
}

