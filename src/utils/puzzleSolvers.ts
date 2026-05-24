export interface LightsOutConfig {
  rows: number
  cols: number
  mask: boolean[][]
  wrap?: boolean
}

export type LightsOutBoard = number[][]
export type LightsOutPresses = number[][] | null

export type MastermindColor = 1 | 2 | 3 | 4 | 5 | 6

export interface MastermindFeedback {
  black: number
  white: number
}

export interface MastermindGuess {
  code: MastermindColor[]
  feedback: MastermindFeedback
}

export const MASTERMIND_COLOR_MAP: Record<MastermindColor, string> = {
  1: '#1976d2',
  2: '#2e7d32',
  3: '#ed6c02',
  4: '#c2185b',
  5: '#d32f2f',
  6: '#f9a825',
}

export function makeRectConfig(rows: number, cols: number): LightsOutConfig {
  return {
    rows,
    cols,
    mask: Array.from({ length: rows }, () => Array(cols).fill(true) as boolean[]),
    wrap: false,
  }
}

export function makeCircular4x4Config(): LightsOutConfig {
  const rows = 4
  const cols = 4
  const mask = Array.from({ length: rows }, () => Array(cols).fill(true) as boolean[])

  mask[0][0] = false
  mask[0][3] = false
  mask[1][1] = false
  mask[1][2] = false
  mask[2][1] = false
  mask[2][2] = false
  mask[3][0] = false
  mask[3][3] = false

  return { rows, cols, mask, wrap: true }
}

export function initLightsOutBoard(config: LightsOutConfig): LightsOutBoard {
  return Array.from({ length: config.rows }, () => Array(config.cols).fill(0) as number[])
}

function createIndexMap(config: LightsOutConfig): { indexOf: number[][]; cellCount: number } {
  const indexOf = Array.from({ length: config.rows }, () => Array(config.cols).fill(-1) as number[])
  let cellCount = 0

  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      if (!config.mask[row][col]) continue
      indexOf[row][col] = cellCount
      cellCount += 1
    }
  }

  return { indexOf, cellCount }
}

function getRingPositions(config: LightsOutConfig): Array<[number, number]> {
  const ring: Array<[number, number]> = []

  for (let col = 0; col < config.cols; col++) {
    if (config.mask[0][col]) ring.push([0, col])
  }

  for (let row = 1; row < config.rows; row++) {
    if (config.mask[row][config.cols - 1]) ring.push([row, config.cols - 1])
  }

  for (let col = config.cols - 2; col >= 0; col--) {
    if (config.mask[config.rows - 1][col]) ring.push([config.rows - 1, col])
  }

  for (let row = config.rows - 2; row >= 1; row--) {
    if (config.mask[row][0]) ring.push([row, 0])
  }

  return ring
}

function applyWrapToggle(
  board: LightsOutBoard,
  mask: boolean[][],
  row: number,
  col: number,
  ring: Array<[number, number]>
): void {
  const index = ring.findIndex(([ringRow, ringCol]) => ringRow === row && ringCol === col)
  if (index < 0) return

  const ringLength = ring.length
  for (const nextIndex of [index, (index - 1 + ringLength) % ringLength, (index + 1) % ringLength]) {
    const [nextRow, nextCol] = ring[nextIndex]
    if (mask[nextRow][nextCol]) {
      board[nextRow][nextCol] ^= 1
    }
  }
}

function applyPlusToggle(board: LightsOutBoard, config: LightsOutConfig, row: number, col: number): void {
  const deltas: ReadonlyArray<readonly [number, number]> = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]

  for (const [rowDelta, colDelta] of deltas) {
    const nextRow = row + rowDelta
    const nextCol = col + colDelta

    if (
      nextRow >= 0 &&
      nextRow < config.rows &&
      nextCol >= 0 &&
      nextCol < config.cols &&
      config.mask[nextRow][nextCol]
    ) {
      board[nextRow][nextCol] ^= 1
    }
  }
}

export function toggleLightsOutCell(
  board: LightsOutBoard,
  config: LightsOutConfig,
  row: number,
  col: number
): LightsOutBoard {
  const nextBoard = board.map((currentRow) => currentRow.slice())

  if (config.wrap) {
    applyWrapToggle(nextBoard, config.mask, row, col, getRingPositions(config))
  } else {
    applyPlusToggle(nextBoard, config, row, col)
  }

  return nextBoard
}

export function randomLightsOutPresses(config: LightsOutConfig, chance = 0.5): number[][] {
  const presses = initLightsOutBoard(config)

  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      if (config.mask[row][col] && Math.random() < chance) {
        presses[row][col] = 1
      }
    }
  }

  return presses
}

export function applyLightsOutPresses(
  board: LightsOutBoard,
  config: LightsOutConfig,
  presses: number[][]
): LightsOutBoard {
  let nextBoard = board

  for (let row = 0; row < presses.length; row++) {
    for (let col = 0; col < presses[row].length; col++) {
      if (presses[row][col] === 1) {
        nextBoard = toggleLightsOutCell(nextBoard, config, row, col)
      }
    }
  }

  return nextBoard
}

function buildNeighborLists(config: LightsOutConfig, indexOf: number[][], cellCount: number): number[][] {
  if (config.wrap) {
    const ring = getRingPositions(config)
    const neighborLists = Array.from({ length: cellCount }, () => [] as number[])

    ring.forEach(([row, col], index) => {
      const current = indexOf[row][col]
      const [prevRow, prevCol] = ring[(index - 1 + ring.length) % ring.length]
      const [nextRow, nextCol] = ring[(index + 1) % ring.length]
      neighborLists[current] = [current, indexOf[prevRow][prevCol], indexOf[nextRow][nextCol]]
    })

    return neighborLists
  }

  const deltas: ReadonlyArray<readonly [number, number]> = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]
  const neighborLists = Array.from({ length: cellCount }, () => [] as number[])

  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      const current = indexOf[row][col]
      if (current < 0) continue

      for (const [rowDelta, colDelta] of deltas) {
        const nextRow = row + rowDelta
        const nextCol = col + colDelta

        if (
          nextRow >= 0 &&
          nextRow < config.rows &&
          nextCol >= 0 &&
          nextCol < config.cols &&
          config.mask[nextRow][nextCol]
        ) {
          neighborLists[current].push(indexOf[nextRow][nextCol])
        }
      }
    }
  }

  return neighborLists
}

function buildAugmentedMatrix(neighborLists: number[][], rightHandSide: boolean[]): boolean[][] {
  const matrix = Array.from({ length: neighborLists.length }, () =>
    Array(neighborLists.length + 1).fill(false) as boolean[]
  )

  neighborLists.forEach((neighbors, index) => {
    neighbors.forEach((neighborIndex) => {
      matrix[index][neighborIndex] = true
    })
    matrix[index][neighborLists.length] = rightHandSide[index]
  })

  return matrix
}

function forwardEliminate(matrix: boolean[][]): number[] {
  const pivots: number[] = []
  let row = 0

  for (let col = 0; col < matrix.length && row < matrix.length; col++) {
    let pivot = -1
    for (let candidate = row; candidate < matrix.length; candidate++) {
      if (matrix[candidate][col]) {
        pivot = candidate
        break
      }
    }

    if (pivot < 0) continue

      ;[matrix[row], matrix[pivot]] = [matrix[pivot], matrix[row]]
    pivots.push(col)

    for (let otherRow = 0; otherRow < matrix.length; otherRow++) {
      if (otherRow === row || !matrix[otherRow][col]) continue

      for (let otherCol = col; otherCol < matrix.length + 1; otherCol++) {
        matrix[otherRow][otherCol] = matrix[otherRow][otherCol] !== matrix[row][otherCol]
      }
    }

    row += 1
  }

  return pivots
}

function backSubstitute(matrix: boolean[][], pivots: number[]): boolean[] {
  const solution = Array(matrix.length).fill(false) as boolean[]

  for (let pivotIndex = pivots.length - 1; pivotIndex >= 0; pivotIndex--) {
    const pivotColumn = pivots[pivotIndex]
    let sum = false

    for (let col = pivotColumn + 1; col < matrix.length; col++) {
      if (matrix[pivotIndex][col] && solution[col]) {
        sum = !sum
      }
    }

    solution[pivotColumn] = matrix[pivotIndex][matrix.length] !== sum
  }

  return solution
}

export function solveLightsOutBoard(
  board: LightsOutBoard,
  config: LightsOutConfig
): { presses: LightsOutPresses; marked: LightsOutPresses } {
  const { indexOf, cellCount } = createIndexMap(config)
  const neighborLists = buildNeighborLists(config, indexOf, cellCount)
  const rightHandSide = Array(cellCount).fill(false) as boolean[]

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const index = indexOf[row][col]
      if (index >= 0) {
        rightHandSide[index] = board[row][col] === 0
      }
    }
  }

  const matrix = buildAugmentedMatrix(neighborLists, rightHandSide)
  const pivots = forwardEliminate(matrix)

  for (let row = pivots.length; row < matrix.length; row++) {
    const hasCoefficients = matrix[row].slice(0, cellCount).some(Boolean)
    const rightValue = matrix[row][cellCount]
    if (!hasCoefficients && rightValue) {
      return { presses: null, marked: null }
    }
  }

  const values = backSubstitute(matrix, pivots)
  const presses = initLightsOutBoard(config)

  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      const index = indexOf[row][col]
      if (index >= 0 && values[index]) {
        presses[row][col] = 1
      }
    }
  }

  return {
    presses,
    marked: presses.map((pressRow) => pressRow.map(() => 0)),
  }
}

export function generateAllMastermindCodes(): MastermindColor[][] {
  const codes: MastermindColor[][] = []

  for (let first = 1 as MastermindColor; first <= 6; first = (first + 1) as MastermindColor) {
    for (let second = 1 as MastermindColor; second <= 6; second = (second + 1) as MastermindColor) {
      for (let third = 1 as MastermindColor; third <= 6; third = (third + 1) as MastermindColor) {
        for (let fourth = 1 as MastermindColor; fourth <= 6; fourth = (fourth + 1) as MastermindColor) {
          codes.push([first, second, third, fourth])
        }
      }
    }
  }

  return codes
}

export function getMastermindFeedback(
  secret: MastermindColor[],
  guess: MastermindColor[]
): MastermindFeedback {
  let black = 0
  let white = 0
  const secretCounts = {} as Record<MastermindColor, number>
  const guessCounts = {} as Record<MastermindColor, number>

  for (let index = 0; index < 4; index++) {
    if (guess[index] === secret[index]) {
      black += 1
      continue
    }

    secretCounts[secret[index]] = (secretCounts[secret[index]] ?? 0) + 1
    guessCounts[guess[index]] = (guessCounts[guess[index]] ?? 0) + 1
  }

  for (const key of Object.keys(guessCounts)) {
    const color = Number(key) as MastermindColor
    if (secretCounts[color]) {
      white += Math.min(guessCounts[color], secretCounts[color])
    }
  }

  return { black, white }
}

function codesMatch(left: MastermindColor[], right: MastermindColor[]): boolean {
  return left.every((value, index) => value === right[index])
}

export function selectNextMastermindGuess(
  possible: MastermindColor[][],
  allCodes: MastermindColor[][]
): MastermindColor[] {
  const scoreMap = new Map<MastermindColor[], number>()
  let bestWorstCase = Number.POSITIVE_INFINITY

  for (const candidate of allCodes) {
    const buckets = new Map<string, number>()

    for (const secret of possible) {
      const feedback = getMastermindFeedback(secret, candidate)
      const key = `${String(feedback.black)}_${String(feedback.white)}`
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }

    const worstCase = Math.max(...buckets.values())
    scoreMap.set(candidate, worstCase)
    if (worstCase < bestWorstCase) {
      bestWorstCase = worstCase
    }
  }

  const bestCandidates = allCodes.filter((candidate) => scoreMap.get(candidate) === bestWorstCase)
  const preferredCandidate = bestCandidates.find((candidate) => possible.some((code) => codesMatch(code, candidate)))

  return preferredCandidate ?? bestCandidates[0]
}