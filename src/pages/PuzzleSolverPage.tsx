import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { type ReactNode, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { DEFAULT_PUZZLE_PATH, getPuzzleBySlug, type PuzzleNavItem } from '@/config/puzzles'
import {
  applyLightsOutPresses,
  generateAllMastermindCodes,
  getMastermindFeedback,
  initLightsOutBoard,
  makeCircular4x4Config,
  makeRectConfig,
  MASTERMIND_COLOR_MAP,
  randomLightsOutPresses,
  selectNextMastermindGuess,
  solveLightsOutBoard,
  toggleLightsOutCell,
  type LightsOutBoard,
  type LightsOutConfig,
  type LightsOutPresses,
  type MastermindColor,
  type MastermindFeedback,
  type MastermindGuess,
} from '@/utils/puzzleSolvers'
import activeTileImage from '@/assets/puzzles/tile_active.png'
import emptyTileImage from '@/assets/puzzles/tile_empty.png'
import inactiveTileImage from '@/assets/puzzles/tile_inactive.png'

const LIGHTS_OUT_TILE_SIZES = {
  xs: 44,
  sm: 52,
  md: 60,
  lg: 64,
} as const
const MASTERMIND_MAX_ATTEMPTS = 10
const MASTERMIND_INITIAL_GUESS: MastermindColor[] = [1, 1, 2, 2]
const MONASTERY_ROWS = 4
const MONASTERY_COLS = 5

const SHROUD_CONFIG_OPTIONS = [
  { label: '3x3', config: makeRectConfig(3, 3) },
  { label: '4x4', config: makeRectConfig(4, 4) },
  { label: '5x5', config: makeRectConfig(5, 5) },
  { label: '6x6', config: makeRectConfig(6, 6) },
  { label: 'Circular (4x4)', config: makeCircular4x4Config() },
] as const

const TOTAL_CHAOS_CONFIG: LightsOutConfig = {
  rows: 3,
  cols: 5,
  mask: [
    [true, false, true, false, true],
    [true, false, true, false, true],
    [true, true, true, true, true],
  ],
}

type EditAction = 'toggle' | 'remove'
type LightsOutMode = 'solve' | 'play'

interface ShadowCryptSubPath {
  label: string
  route: string
}

interface ShadowCryptPathOption {
  label: string
  routes: string | readonly ShadowCryptSubPath[]
}

interface ShadowCryptPuzzle {
  label: string
  options: readonly ShadowCryptPathOption[]
}

const SHADOW_CRYPT_PUZZLES: readonly ShadowCryptPuzzle[] = [
  {
    label: 'Red',
    options: [
      { label: '12-Gear', routes: 'EEEESSNWN(DD)SESSW' },
      {
        label: '8-Gear Duo',
        routes: [
          { label: 'Duo A', route: 'NNSEW' },
          { label: 'Duo B', route: 'WWEWW' },
        ],
      },
    ],
  },
  {
    label: 'Green',
    options: [
      { label: '12-Gear', routes: 'EEENNNNNNN(DD)WSWSEW' },
      {
        label: '8-Gear Duo',
        routes: [
          { label: 'Duo A', route: 'WWNEW' },
          { label: 'Duo B', route: 'WENEW' },
        ],
      },
    ],
  },
  {
    label: 'Blue',
    options: [
      { label: '12-Gear', routes: '(DD)NWWWWNNNSSNWWEE' },
      {
        label: '8-Gear Duo',
        routes: [
          { label: 'Duo A', route: 'SNSEE' },
          { label: 'Duo B', route: 'WSEEE' },
        ],
      },
    ],
  },
]

function buildFullMask(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(true) as boolean[])
}

function cloneNumberGrid(grid: number[][]): number[][] {
  return grid.map((row) => row.slice())
}

function countLightsOutPresses(presses: LightsOutPresses): number {
  if (!presses) {
    return 0
  }

  return presses.reduce((total, row) => total + row.reduce((rowTotal, value) => rowTotal + value, 0), 0)
}

function getLightsOutRecommendedTiles(config: LightsOutConfig, solution: LightsOutPresses): string[] {
  if (!solution) {
    return []
  }

  const labels: string[] = []

  for (let row = 0; row < config.rows; row += 1) {
    for (let col = 0; col < config.cols; col += 1) {
      if (config.mask[row][col] && solution[row][col] === 1) {
        labels.push(`R${String(row + 1)}C${String(col + 1)}`)
      }
    }
  }

  return labels
}

function getLightsOutTileBackground(isHole: boolean, isOn: boolean): string {
  if (isHole) {
    return `url(${emptyTileImage})`
  }

  if (isOn) {
    return `url(${activeTileImage})`
  }

  return `url(${inactiveTileImage})`
}

function useLightsOutState(config: LightsOutConfig) {
  const [board, setBoard] = useState<LightsOutBoard>(() => initLightsOutBoard(config))
  const [mode, setMode] = useState<LightsOutMode>('solve')
  const [showPlaySolution, setShowPlaySolution] = useState(false)
  const solution = useMemo(() => solveLightsOutBoard(board, config).presses, [board, config])
  const solveError = solution ? null : 'No solution exists for this board state.'

  const handleSetupToggle = (row: number, col: number) => {
    if (!config.mask[row][col]) return

    setBoard((previousBoard) => {
      const nextBoard = cloneNumberGrid(previousBoard)
      nextBoard[row][col] = nextBoard[row][col] ? 0 : 1
      return nextBoard
    })
  }

  const handlePlayClick = (row: number, col: number) => {
    if (!config.mask[row][col]) return

    setBoard((previousBoard) => toggleLightsOutCell(previousBoard, config, row, col))
  }

  const handleReset = () => {
    setBoard(initLightsOutBoard(config))
    setMode('solve')
    setShowPlaySolution(false)
  }

  const handleRandom = () => {
    const randomPresses = randomLightsOutPresses(config)
    const randomBoard = applyLightsOutPresses(initLightsOutBoard(config), config, randomPresses)

    setBoard(randomBoard)
    setShowPlaySolution(false)
  }

  return {
    board,
    handlePlayClick,
    handleRandom,
    handleReset,
    handleSetupToggle,
    mode,
    setMode,
    setShowPlaySolution,
    showPlaySolution,
    solution,
    solveError,
  }
}

function getLightsOutCellAriaLabel(config: LightsOutConfig, board: LightsOutBoard, row: number, col: number): string {
  const rowLabel = row + 1
  const colLabel = col + 1

  if (!config.mask[row][col]) {
    return `Row ${String(rowLabel)}, column ${String(colLabel)}, removed tile`
  }

  return `Row ${String(rowLabel)}, column ${String(colLabel)}, ${board[row][col] === 1 ? 'lit' : 'unlit'} tile`
}

function LightsOutGrid({
  board,
  config,
  onCellClick,
  highlightSolution = false,
  interactive = true,
  solution,
}: {
  board: LightsOutBoard
  config: LightsOutConfig
  onCellClick?: (row: number, col: number) => void
  highlightSolution?: boolean
  interactive?: boolean
  solution: LightsOutPresses
}) {
  return (
    <Box
      sx={{
        '--tile-gap': '4px',
        '--tile-size': {
          xs: `${String(LIGHTS_OUT_TILE_SIZES.xs)}px`,
          sm: `${String(LIGHTS_OUT_TILE_SIZES.sm)}px`,
          md: `${String(LIGHTS_OUT_TILE_SIZES.md)}px`,
          lg: `${String(LIGHTS_OUT_TILE_SIZES.lg)}px`,
        },
        display: 'grid',
        gap: 'var(--tile-gap)',
        gridTemplateColumns: `repeat(${String(config.cols)}, var(--tile-size))`,
        justifyContent: 'center',
      }}
    >
      {Array.from({ length: config.rows }).flatMap((_, row) =>
        Array.from({ length: config.cols }).map((_, col) => {
          const isHole = !config.mask[row][col]
          const isOn = board[row][col] === 1
          const isSuggested = Boolean(highlightSolution && solution && solution[row][col] === 1)
          const isInteractiveCell = interactive && !isHole && Boolean(onCellClick)
          const ariaLabel = `${getLightsOutCellAriaLabel(config, board, row, col)}${isSuggested ? ', recommended press' : ''}`

          return (
            <Box
              key={`${String(row)}-${String(col)}`}
              component={isInteractiveCell ? 'button' : 'div'}
              type={isInteractiveCell ? 'button' : undefined}
              aria-label={ariaLabel}
              tabIndex={isInteractiveCell ? 0 : -1}
              onClick={isInteractiveCell && onCellClick ? () => onCellClick(row, col) : undefined}
              sx={{
                alignItems: 'center',
                appearance: 'none',
                backgroundColor: '#000',
                backgroundImage: getLightsOutTileBackground(isHole, isOn),
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                border: '1px solid',
                borderColor: isSuggested ? 'success.main' : 'divider',
                borderRadius: 0,
                borderWidth: isSuggested ? 4 : 1,
                boxShadow: 'none',
                cursor: isInteractiveCell ? 'pointer' : 'default',
                display: 'flex',
                height: 'var(--tile-size)',
                justifyContent: 'center',
                opacity: isHole ? 0.4 : 1,
                outline: 'none',
                '&:focus-visible': isInteractiveCell
                  ? {
                    boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.9), 0 0 0 4px rgba(144, 202, 249, 0.95)',
                    outline: 'none',
                    position: 'relative',
                    zIndex: 1,
                  }
                  : undefined,
                pointerEvents: interactive && !isHole ? 'auto' : 'none',
                overflow: 'hidden',
                p: 0,
                width: 'var(--tile-size)',
              }}
            />
          )
        })
      )}
    </Box>
  )
}

function LightsOutLegend() {
  return (
    <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" justifyContent="center">
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{ width: 20, height: 20, border: '4px solid', borderColor: 'success.main' }} />
        <Typography variant="body2" color="text.secondary">
          Press this tile
        </Typography>
      </Stack>
    </Stack>
  )
}

function LightsOutBoardFrame({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        alignSelf: 'center',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.08))',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
        display: 'inline-flex',
        justifyContent: 'center',
        p: { xs: 0.75, sm: 1.25, md: 2 },
      }}
    >
      {children}
    </Box>
  )
}

function LightsOutBoardViewport({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <Box sx={{ width: 'fit-content', mx: 'auto' }}>
        {children}
      </Box>
    </Box>
  )
}

function LightsOutModeToggle({
  mode,
  onModeChange,
}: {
  mode: LightsOutMode
  onModeChange: (mode: LightsOutMode) => void
}) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={mode}
      onChange={(_, nextMode: LightsOutMode | null) => {
        if (nextMode) {
          onModeChange(nextMode)
        }
      }}
    >
      <ToggleButton value="solve">Solve Mode</ToggleButton>
      <ToggleButton value="play">Play Mode</ToggleButton>
    </ToggleButtonGroup>
  )
}

function LightsOutWorkspace({
  config,
  board,
  helperText,
  mode,
  onModeChange,
  onPlayBoardClick,
  onRandom,
  onReset,
  onSolveBoardClick,
  onTogglePlaySolution,
  setupControls,
  showPlaySolution,
  solution,
  solveError,
}: {
  config: LightsOutConfig
  board: LightsOutBoard
  helperText: string
  mode: LightsOutMode
  onModeChange: (mode: LightsOutMode) => void
  onPlayBoardClick: (row: number, col: number) => void
  onRandom: () => void
  onReset: () => void
  onSolveBoardClick: (row: number, col: number) => void
  onTogglePlaySolution: () => void
  setupControls?: ReactNode
  showPlaySolution: boolean
  solution: LightsOutPresses
  solveError: string | null
}) {
  const pressCount = countLightsOutPresses(solution)
  const isSolved = !solveError && pressCount === 0
  const recommendedTiles = useMemo(() => getLightsOutRecommendedTiles(config, solution), [config, solution])
  const recommendedTileSummary = recommendedTiles.length > 0 ? recommendedTiles.join(', ') : 'None'

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, lg: 7 }}>
            <Stack spacing={1}>
              <Typography variant="h6">{mode === 'solve' ? 'Solve Mode' : 'Play Mode'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {mode === 'solve'
                  ? helperText
                  : 'Click the live board to apply real puzzle presses. Switch back to Solve Mode anytime for the updated recommendation.'}
              </Typography>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Stack spacing={1.5} sx={{ alignItems: { xs: 'flex-start', lg: 'flex-end' } }}>
              <LightsOutModeToggle mode={mode} onModeChange={onModeChange} />
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Button variant="contained" color="info" onClick={onRandom}>
                  Load Random Puzzle
                </Button>
                <Button variant="outlined" onClick={onReset}>
                  Reset Board
                </Button>
                {mode === 'play' ? (
                  <ToggleButton
                    value="show-play-solution"
                    selected={showPlaySolution}
                    color="success"
                    onChange={onTogglePlaySolution}
                  >
                    {showPlaySolution ? 'Hide Solution' : 'Show Solution'}
                  </ToggleButton>
                ) : null}
              </Stack>
              {setupControls}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {mode === 'solve' ? (
        <>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, lg: 7 }}>
                <Stack spacing={0.75}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Live Solve Summary
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Match the in-game puzzle state, then compare it with the live recommended presses below. On wider screens the boards sit side by side; on smaller screens they stack without changing behavior.
                  </Typography>
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, lg: 5 }}>
                <Stack spacing={1.25} sx={{ alignItems: { xs: 'flex-start', lg: 'flex-end' } }}>
                  {solveError ? (
                    <Alert severity="error" sx={{ width: '100%', maxWidth: 360 }}>
                      {solveError}
                    </Alert>
                  ) : isSolved ? (
                    <Alert severity="success" sx={{ width: '100%', maxWidth: 360 }}>
                      This board is already solved.
                    </Alert>
                  ) : (
                    <Alert severity="info" sx={{ width: '100%', maxWidth: 360 }}>
                      Press {pressCount} {pressCount === 1 ? 'tile' : 'tiles'}. Order does not matter.
                    </Alert>
                  )}
                  {!solveError ? <LightsOutLegend /> : null}
                  {!solveError ? (
                    <Typography variant="caption" color="text.secondary">
                      Recommended tiles: {recommendedTileSummary}
                    </Typography>
                  ) : null}
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Paper sx={{ p: 2.5, height: '100%' }}>
                <Stack spacing={2} sx={{ height: '100%' }}>
                  <Stack spacing={0.25}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Step 1
                    </Typography>
                    <Typography variant="h6">Puzzle State</Typography>
                  </Stack>
                  <Box sx={{ display: 'flex', flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <LightsOutBoardViewport>
                      <LightsOutBoardFrame>
                        <LightsOutGrid board={board} config={config} onCellClick={onSolveBoardClick} solution={solution} />
                      </LightsOutBoardFrame>
                    </LightsOutBoardViewport>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, lg: 6 }}>
              <Paper sx={{ p: 2.5, height: '100%' }}>
                <Stack spacing={2} sx={{ height: '100%' }}>
                  <Stack spacing={0.25}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Step 2
                    </Typography>
                    <Typography variant="h6">Recommended Presses</Typography>
                  </Stack>
                  <Box sx={{ display: 'flex', flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <LightsOutBoardViewport>
                      <LightsOutBoardFrame>
                        <LightsOutGrid
                          board={board}
                          config={config}
                          interactive={false}
                          highlightSolution
                          solution={solution}
                        />
                      </LightsOutBoardFrame>
                    </LightsOutBoardViewport>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </>
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 2.5, height: '100%' }}>
              <Stack spacing={1.5}>
                <Typography variant="h6">Live Board</Typography>
                <Typography variant="body2" color="text.secondary">
                  Click any tile to apply a real puzzle press.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 0.5 }}>
                  <LightsOutBoardViewport>
                    <LightsOutBoardFrame>
                      <LightsOutGrid
                        board={board}
                        config={config}
                        onCellClick={onPlayBoardClick}
                        highlightSolution={showPlaySolution}
                        solution={solution}
                      />
                    </LightsOutBoardFrame>
                  </LightsOutBoardViewport>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2.5, height: '100%' }}>
              <Stack spacing={1.5}>
                <Typography variant="h6">Progress</Typography>
                {solveError ? (
                  <Alert severity="error">This state is not solvable. Switch to Solve Mode to correct it.</Alert>
                ) : isSolved ? (
                  <Alert severity="success">Solved. No more presses are needed.</Alert>
                ) : (
                  <Alert severity="info">
                    {pressCount} {pressCount === 1 ? 'press remains' : 'presses remain'} from this state.
                  </Alert>
                )}
                {showPlaySolution && !solveError ? <LightsOutLegend /> : null}
                {showPlaySolution && !solveError ? (
                  <Typography variant="caption" color="text.secondary">
                    Recommended tiles: {recommendedTileSummary}
                  </Typography>
                ) : null}
                <Typography variant="body2" color="text.secondary">
                  {showPlaySolution
                    ? 'Solution overlay is visible on the live board. Green borders mark the recommended presses.'
                    : 'Use the Show Solution toggle to overlay the current answer while staying in Play Mode.'}
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Stack>
  )
}

function LightsOutSolverPanel({
  config,
  helperText,
}: {
  config: LightsOutConfig
  helperText: string
}) {
  const {
    board,
    handlePlayClick,
    handleRandom,
    handleReset,
    handleSetupToggle,
    mode,
    setMode,
    setShowPlaySolution,
    showPlaySolution,
    solution,
    solveError,
  } = useLightsOutState(config)

  return (
    <LightsOutWorkspace
      board={board}
      config={config}
      helperText={helperText}
      mode={mode}
      onModeChange={setMode}
      onPlayBoardClick={handlePlayClick}
      onRandom={handleRandom}
      onReset={handleReset}
      onSolveBoardClick={handleSetupToggle}
      onTogglePlaySolution={() => setShowPlaySolution((previousValue) => !previousValue)}
      showPlaySolution={showPlaySolution}
      solution={solution}
      solveError={solveError}
    />
  )
}

function LightsOutSolver({
  helperText,
  options,
}: {
  helperText: string
  options: readonly { label: string; config: LightsOutConfig }[]
}) {
  const [selectedLabel, setSelectedLabel] = useState(options[0].label)
  const selectedOption = options.find((option) => option.label === selectedLabel) ?? options[0]

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        {options.length > 1 ? (
          <TextField
            select
            label="Board"
            value={selectedLabel}
            onChange={(event) => setSelectedLabel(event.target.value)}
            sx={{ maxWidth: 240 }}
          >
            {options.map((option) => (
              <MenuItem key={option.label} value={option.label}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ) : null}

        <LightsOutSolverPanel key={selectedLabel} config={selectedOption.config} helperText={helperText} />
      </Stack>
    </Paper>
  )
}

function MonasterySolverContent({
  config,
  editAction,
  onEditActionChange,
  onMaskChange,
  onReset,
}: {
  config: LightsOutConfig
  editAction: EditAction
  onEditActionChange: (action: EditAction) => void
  onMaskChange: (updater: (previousMask: boolean[][]) => boolean[][]) => void
  onReset: () => void
}) {
  const {
    board,
    handlePlayClick,
    handleRandom,
    handleSetupToggle,
    mode,
    setMode,
    setShowPlaySolution,
    showPlaySolution,
    solution,
    solveError,
  } = useLightsOutState(config)

  const handleResetBoard = () => {
    onReset()
  }

  const handleCellClick = (row: number, col: number) => {
    if (!config.mask[row][col]) return

    if (mode === 'solve') {
      if (editAction === 'remove') {
        onMaskChange((previousMask) => {
          const nextMask = previousMask.map((maskRow) => maskRow.slice())
          nextMask[row][col] = false
          return nextMask
        })
      } else {
        handleSetupToggle(row, col)
      }
      return
    }

    handlePlayClick(row, col)
  }

  const setupControls = mode === 'solve' ? (
    <Stack spacing={0.75} sx={{ alignItems: { xs: 'flex-start', lg: 'flex-end' } }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Solve Mode Tool
      </Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={editAction}
        onChange={(_, nextAction: EditAction | null) => {
          if (nextAction) {
            onEditActionChange(nextAction)
          }
        }}
      >
        <ToggleButton value="toggle">Toggle Tile</ToggleButton>
        <ToggleButton value="remove">Burned Out</ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  ) : null

  return (
    <LightsOutWorkspace
      board={board}
      config={config}
      helperText="Build the exact tile pattern on the left, then read the live solution on the right. Burned-out spaces can be removed before you switch to Play Mode."
      mode={mode}
      onModeChange={setMode}
      onPlayBoardClick={handlePlayClick}
      onRandom={handleRandom}
      onReset={handleResetBoard}
      onSolveBoardClick={handleCellClick}
      onTogglePlaySolution={() => setShowPlaySolution((previousValue) => !previousValue)}
      setupControls={setupControls}
      showPlaySolution={showPlaySolution}
      solution={solution}
      solveError={solveError}
    />
  )
}

function MonasterySolver() {
  const [mask, setMask] = useState(() => buildFullMask(MONASTERY_ROWS, MONASTERY_COLS))
  const [editAction, setEditAction] = useState<EditAction>('toggle')
  const [resetVersion, setResetVersion] = useState(0)
  const config = useMemo<LightsOutConfig>(() => ({ rows: MONASTERY_ROWS, cols: MONASTERY_COLS, mask }), [mask])

  const handleMaskChange = (updater: (previousMask: boolean[][]) => boolean[][]) => {
    setMask((previousMask) => updater(previousMask))
  }

  const handleReset = () => {
    setMask(buildFullMask(MONASTERY_ROWS, MONASTERY_COLS))
    setEditAction('toggle')
    setResetVersion((previousVersion) => previousVersion + 1)
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <MonasterySolverContent
          key={String(resetVersion)}
          config={config}
          editAction={editAction}
          onEditActionChange={setEditAction}
          onMaskChange={handleMaskChange}
          onReset={handleReset}
        />
      </Stack>
    </Paper>
  )
}

function MastermindPeg({ color }: { color: MastermindColor }) {
  return (
    <Box
      sx={{
        alignItems: 'center',
        backgroundColor: MASTERMIND_COLOR_MAP[color],
        border: '2px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '50%',
        color: '#fff',
        display: 'flex',
        fontSize: '0.95rem',
        fontWeight: 700,
        height: 40,
        justifyContent: 'center',
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.65)',
        width: 40,
      }}
    >
      {color}
    </Box>
  )
}

function MastermindFeedbackDots({ feedback }: { feedback: MastermindFeedback }) {
  const greyCount = 4 - feedback.black - feedback.white
  const dots = [
    ...Array.from({ length: feedback.black }, () => 'black' as const),
    ...Array.from({ length: feedback.white }, () => 'white' as const),
    ...Array.from({ length: greyCount }, () => 'grey' as const),
  ]

  return (
    <Box
      aria-hidden="true"
      sx={{
        display: 'grid',
        gap: 0.5,
        gridTemplateColumns: 'repeat(2, 14px)',
        gridTemplateRows: 'repeat(2, 14px)',
      }}
    >
      {dots.map((dot, index) => (
        <Box
          key={`${dot}-${String(index)}`}
          sx={{
            backgroundColor: dot === 'grey' ? 'grey.700' : dot,
            border: '1px solid',
            borderColor: 'rgba(255,255,255,0.15)',
            borderRadius: '50%',
            height: 14,
            width: 14,
          }}
        />
      ))}
    </Box>
  )
}

function formatMastermindFeedback(feedback: MastermindFeedback): string {
  return `${String(feedback.black)} black, ${String(feedback.white)} white`
}

function MastermindGuessRow({ guess }: { guess: MastermindGuess }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
      <Stack direction="row" spacing={1}>
        {guess.code.map((color, index) => (
          <MastermindPeg key={`${String(color)}-${String(index)}`} color={color} />
        ))}
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <MastermindFeedbackDots feedback={guess.feedback} />
        <Typography variant="body2" color="text.secondary">
          {formatMastermindFeedback(guess.feedback)}
        </Typography>
      </Stack>
    </Stack>
  )
}

function MastermindSolver() {
  const allCodes = useMemo(() => generateAllMastermindCodes(), [])
  const [possible, setPossible] = useState<MastermindColor[][]>(allCodes)
  const [guesses, setGuesses] = useState<MastermindGuess[]>([])
  const [currentGuess, setCurrentGuess] = useState<MastermindColor[]>(MASTERMIND_INITIAL_GUESS)
  const [finished, setFinished] = useState(false)
  const [blackInput, setBlackInput] = useState(0)
  const [whiteInput, setWhiteInput] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const lastFeedback = guesses.length > 0 ? guesses[guesses.length - 1].feedback : undefined
  const solved = lastFeedback?.black === 4 || possible.length === 1

  const handleReset = () => {
    setPossible(allCodes)
    setGuesses([])
    setCurrentGuess(MASTERMIND_INITIAL_GUESS)
    setFinished(false)
    setBlackInput(0)
    setWhiteInput(0)
    setError(null)
  }

  const handleSubmit = () => {
    if (blackInput + whiteInput > 4) {
      setError('The sum of black and white pegs cannot exceed 4.')
      return
    }

    const nextPossible = possible.filter((code) => {
      const feedback = getMastermindFeedback(code, currentGuess)
      return feedback.black === blackInput && feedback.white === whiteInput
    })

    if (nextPossible.length === 0) {
      setError('That feedback is inconsistent with the previous guesses.')
      return
    }

    const nextGuesses = [...guesses, { code: currentGuess, feedback: { black: blackInput, white: whiteInput } }]
    setGuesses(nextGuesses)
    setError(null)
    setBlackInput(0)
    setWhiteInput(0)

    if (blackInput === 4 || nextGuesses.length >= MASTERMIND_MAX_ATTEMPTS) {
      setFinished(true)
      return
    }

    setPossible(nextPossible)

    if (nextPossible.length === 1) {
      setCurrentGuess(nextPossible[0])
      setFinished(true)
      return
    }

    setCurrentGuess(selectNextMastermindGuess(nextPossible, allCodes))
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Paper sx={{ p: 2.5, height: '100%' }}>
          <Stack spacing={2}>
            <Typography variant="h6">Mastermind Solver</Typography>

            {error ? <Alert severity="error">{error}</Alert> : null}

            {finished ? (
              solved ? (
                <Alert severity="success">Puzzle solved. Use the combination below.</Alert>
              ) : (
                <Alert severity="error">No solution was found within 10 attempts.</Alert>
              )
            ) : (
              <Alert severity="info">Enter the black and white peg counts returned after each guess.</Alert>
            )}

            {solved ? (
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  Solution
                </Typography>
                <Stack direction="row" spacing={1}>
                  {currentGuess.map((color, index) => (
                    <MastermindPeg key={`${String(color)}-${String(index)}`} color={color} />
                  ))}
                </Stack>
              </Stack>
            ) : null}
          </Stack>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <Paper sx={{ p: 2.5, height: '100%' }}>
          <Stack spacing={2}>
            <Typography variant="h6">
              Attempt {Math.min(guesses.length + 1, MASTERMIND_MAX_ATTEMPTS)} of {MASTERMIND_MAX_ATTEMPTS}
            </Typography>

            {!solved ? (
              <Typography variant="body2" color="text.secondary">
                Remaining possibilities: {possible.length}
              </Typography>
            ) : null}

            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Next guess
              </Typography>
              <Stack direction="row" spacing={1}>
                {currentGuess.map((color, index) => (
                  <MastermindPeg key={`${String(color)}-${String(index)}`} color={color} />
                ))}
              </Stack>
            </Stack>

            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
              <TextField
                label="Black"
                type="number"
                value={blackInput}
                onChange={(event) => setBlackInput(Number(event.target.value))}
                inputProps={{ min: 0, max: 4 }}
                disabled={finished}
                sx={{ width: 120 }}
              />
              <TextField
                label="White"
                type="number"
                value={whiteInput}
                onChange={(event) => setWhiteInput(Number(event.target.value))}
                inputProps={{ min: 0, max: 4 }}
                disabled={finished}
                sx={{ width: 120 }}
              />
            </Stack>

            {finished ? (
              <Button variant="outlined" onClick={handleReset}>
                Start Over
              </Button>
            ) : (
              <Button variant="contained" onClick={handleSubmit}>
                Submit Feedback
              </Button>
            )}
          </Stack>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <Paper sx={{ p: 2.5, height: '100%' }}>
          <Stack spacing={2}>
            <Typography variant="h6">Previous Guesses</Typography>
            {guesses.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No feedback submitted yet.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {guesses.map((guess, index) => (
                  <MastermindGuessRow key={`${guess.code.join('-')}-${String(index)}`} guess={guess} />
                ))}
              </Stack>
            )}
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  )
}

function parseShadowCryptSteps(route: string): string[] {
  return route.match(/\(DD\)|[NESW]/g) ?? []
}

function describeShadowCryptStep(step: string): string {
  if (step === '(DD)') {
    return 'Dimension Door back to the entrance'
  }

  if (step === 'N') return 'Move North'
  if (step === 'S') return 'Move South'
  if (step === 'E') return 'Move East'
  return 'Move West'
}

function buildShadowCryptKey(colorLabel: string, optionLabel: string, subLabel: string): string {
  return `${colorLabel}:${optionLabel}:${subLabel || 'single'}`
}

function createShadowCryptCheckedState(): Record<string, boolean[]> {
  const initialState: Record<string, boolean[]> = {}

  SHADOW_CRYPT_PUZZLES.forEach(({ label, options }) => {
    options.forEach((option) => {
      const subPaths = Array.isArray(option.routes)
        ? option.routes
        : [{ label: '', route: option.routes }]

      subPaths.forEach((subPath) => {
        initialState[buildShadowCryptKey(label, option.label, subPath.label)] = parseShadowCryptSteps(subPath.route).map(
          () => false
        )
      })
    })
  })

  return initialState
}

function ShadowCryptSolver() {
  const [tabValue, setTabValue] = useState('instructions')
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean[]>>(createShadowCryptCheckedState)
  const [activeOptions, setActiveOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(SHADOW_CRYPT_PUZZLES.map((puzzle) => [puzzle.label, puzzle.options[0].label]))
  )
  const [horizontal, setHorizontal] = useState(false)

  const activePuzzle = SHADOW_CRYPT_PUZZLES.find((puzzle) => puzzle.label === tabValue)

  const toggleStep = (key: string, stepIndex: number) => {
    setCheckedSteps((previousSteps) => {
      const nextValues = [...previousSteps[key]]
      nextValues[stepIndex] = !nextValues[stepIndex]
      return { ...previousSteps, [key]: nextValues }
    })
  }

  const resetPath = (key: string) => {
    setCheckedSteps((previousSteps) => ({
      ...previousSteps,
      [key]: previousSteps[key].map(() => false),
    }))
  }

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} useFlexGap flexWrap="wrap">
          <Typography variant="body2" color="text.secondary">
            Check each step as the group moves through the maze. Use horizontal mode if you want a compact hallway view.
          </Typography>
          <Button
            size="small"
            variant={horizontal ? 'contained' : 'outlined'}
            color="info"
            onClick={() => setHorizontal((previousValue) => !previousValue)}
          >
            {horizontal ? 'Vertical' : 'Horizontal'}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, value) => setTabValue(value)}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab label="Instructions" value="instructions" />
          {SHADOW_CRYPT_PUZZLES.map((puzzle) => (
            <Tab key={puzzle.label} label={puzzle.label} value={puzzle.label} />
          ))}
        </Tabs>

        <Box sx={{ mt: 3 }}>
          {tabValue === 'instructions' ? (
            <Stack spacing={2}>
              <Typography variant="h6">How To Use It</Typography>
              <Box component="ol" sx={{ m: 0, pl: 3 }}>
                <Typography component="li" sx={{ mb: 1 }}>
                  Head to the first room east of the starting point.
                </Typography>
                <Typography component="li" sx={{ mb: 1 }}>
                  Identify whether that room is Red, Green, or Blue, then open the matching tab.
                </Typography>
                <Typography component="li" sx={{ mb: 1 }}>
                  Follow the listed directions in order.
                </Typography>
                <Typography component="li" sx={{ mb: 1 }}>
                  When you see DD, cast Dimension Door back to the start instead of trying to run backward.
                </Typography>
                <Typography component="li">Mark steps as completed to keep your place.</Typography>
              </Box>

              <Typography variant="h6">8-Gear Duo Notes</Typography>
              <Box component="ol" sx={{ m: 0, pl: 3 }}>
                <Typography component="li" sx={{ mb: 1 }}>
                  Duo A enters the east room first and follows the path from the top checkbox.
                </Typography>
                <Typography component="li">
                  Duo B waits at the entrance until the color callout is known, then starts from the entrance unless the first step is East.
                </Typography>
              </Box>
            </Stack>
          ) : activePuzzle ? (
            <Stack spacing={3}>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {activePuzzle.options.map((option) => {
                  const isActive = activeOptions[activePuzzle.label] === option.label
                  return (
                    <Button
                      key={option.label}
                      variant={isActive ? 'contained' : 'outlined'}
                      onClick={() =>
                        setActiveOptions((previousOptions) => ({
                          ...previousOptions,
                          [activePuzzle.label]: option.label,
                        }))
                      }
                    >
                      {option.label}
                    </Button>
                  )
                })}
              </Stack>

              {activePuzzle.options
                .filter((option) => option.label === activeOptions[activePuzzle.label])
                .map((option) => {
                  const subPaths = Array.isArray(option.routes)
                    ? option.routes
                    : [{ label: '', route: option.routes }]

                  return (
                    <Grid container spacing={2} key={`${activePuzzle.label}:${option.label}`}>
                      {subPaths.map((subPath) => {
                        const key = buildShadowCryptKey(activePuzzle.label, option.label, subPath.label)
                        const flags = checkedSteps[key] ?? []
                        const steps = parseShadowCryptSteps(subPath.route)

                        return (
                          <Grid
                            key={`${activePuzzle.label}:${option.label}:${subPath.label || 'single'}`}
                            size={{ xs: 12, md: subPaths.length > 1 && !horizontal ? 6 : 12 }}
                          >
                            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                              <Stack spacing={2}>
                                {subPath.label ? <Typography variant="h6">{subPath.label}</Typography> : null}

                                <Stack
                                  direction={horizontal ? 'row' : 'column'}
                                  spacing={horizontal ? 1 : 1.5}
                                  useFlexGap
                                  flexWrap="wrap"
                                  alignItems={horizontal ? 'center' : 'stretch'}
                                >
                                  {steps.map((step, index) => (
                                    <Stack
                                      key={`${key}-${String(index)}`}
                                      direction="row"
                                      spacing={1}
                                      alignItems="center"
                                      sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        px: 1,
                                        py: 0.75,
                                      }}
                                    >
                                      <FormControlLabel
                                        sx={{ m: 0, gap: 0.5 }}
                                        control={
                                          <Checkbox
                                            size="small"
                                            checked={flags[index] ?? false}
                                            onChange={() => toggleStep(key, index)}
                                          />
                                        }
                                        label={
                                          <Typography variant="body2">
                                            {horizontal ? (step === '(DD)' ? 'DD' : step) : describeShadowCryptStep(step)}
                                          </Typography>
                                        }
                                      />
                                      {horizontal && index < steps.length - 1 ? (
                                        <Typography color="text.secondary">-&gt;</Typography>
                                      ) : null}
                                    </Stack>
                                  ))}
                                </Stack>

                                <Button variant="outlined" size="small" onClick={() => resetPath(key)}>
                                  Reset {subPath.label || option.label}
                                </Button>
                              </Stack>
                            </Paper>
                          </Grid>
                        )
                      })}
                    </Grid>
                  )
                })}
            </Stack>
          ) : null}
        </Box>
      </Paper>
    </Stack>
  )
}

function renderPuzzleContent(puzzle: PuzzleNavItem) {
  switch (puzzle.solver) {
    case 'monastery':
      return <MonasterySolver />
    case 'mastermind':
      return <MastermindSolver />
    case 'shadow-crypt':
      return <ShadowCryptSolver />
    case 'shroud':
      return (
        <LightsOutSolver
          helperText="Choose the board shape, match the current puzzle state in Solve Mode, then switch to Play Mode when you want to click through the real board."
          options={SHROUD_CONFIG_OPTIONS}
        />
      )
    case 'total-chaos':
      return (
        <LightsOutSolver
          helperText="Match the W-shaped board in Solve Mode, then use Play Mode when you want to apply presses on the live board."
          options={[{ label: 'W board', config: TOTAL_CHAOS_CONFIG }]}
        />
      )
    default:
      return null
  }
}

export default function PuzzleSolverPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const puzzle = getPuzzleBySlug(slug)

  if (!puzzle) {
    return <Navigate to={DEFAULT_PUZZLE_PATH} replace />
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={1}>
            <Typography variant="h4">{puzzle.label}</Typography>
            <Typography color="text.secondary">{puzzle.subtitle}</Typography>
            <Typography variant="body2" color="text.secondary">
              {puzzle.description}
            </Typography>
          </Stack>
        </Paper>

        <Box key={puzzle.id}>{renderPuzzleContent(puzzle)}</Box>
      </Stack>
    </Container>
  )
}