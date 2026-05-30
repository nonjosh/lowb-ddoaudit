import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Layout from '@/components/layout/Layout'
import { DEFAULT_PUZZLE_PATH } from '@/config/puzzles'
import { GearPlannerProvider } from '@/contexts/GearPlannerContext'
import { LfmProvider } from '@/contexts/LfmContext'
import { RansackProvider } from '@/contexts/RansackContext'
import { TRPlannerProvider } from '@/contexts/TRPlannerContext'
import { TroveProvider } from '@/contexts/TroveContext'
import { WishlistProvider } from '@/contexts/WishlistContext'
import Dashboard from '@/pages/Dashboard'
import CurrencyConverter from '@/pages/CurrencyConverter'
import GearPlanner from '@/pages/GearPlanner'
import GreenSteelCrafting from '@/pages/GreenSteelCrafting'
import LegendaryGreenSteelCrafting from '@/pages/LegendaryGreenSteelCrafting'
import ItemWiki from '@/pages/ItemWiki'
import PuzzleSolverPage from '@/pages/PuzzleSolverPage'
import TRPlanner from '@/pages/TRPlanner'
import ViktraniumCrafting from '@/pages/ViktraniumCrafting'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <WishlistProvider>
        <RansackProvider>
          <TroveProvider>
            <GearPlannerProvider>
              <TRPlannerProvider>
                <LfmProvider>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      {/* Gear-related routes */}
                      <Route path="/gear/wiki" element={<ItemWiki />} />
                      <Route path="/gear/planner" element={<GearPlanner />} />
                      {/* Crafting */}
                      <Route path="/crafting/viktranium" element={<ViktraniumCrafting />} />
                      <Route path="/crafting/greensteel" element={<GreenSteelCrafting />} />
                      <Route path="/crafting/lgs" element={<LegendaryGreenSteelCrafting />} />
                      {/* Puzzle solvers */}
                      <Route path="/puzzles" element={<Navigate to={DEFAULT_PUZZLE_PATH} replace />} />
                      <Route path="/puzzles/:slug" element={<PuzzleSolverPage />} />
                      {/* Other tools */}
                      <Route path="/tools/converter" element={<CurrencyConverter />} />
                      <Route path="/tr-planner" element={<TRPlanner />} />
                      {/* Redirects for backward compatibility */}
                      <Route path="/wiki" element={<Navigate to="/gear/wiki" replace />} />
                      <Route path="/wishlist" element={<Navigate to="/gear/wiki" replace />} />
                      <Route path="/gear/wishlist" element={<Navigate to="/gear/wiki" replace />} />
                      <Route path="/planner" element={<Navigate to="/gear/planner" replace />} />
                    </Routes>
                  </Layout>
                </LfmProvider>
              </TRPlannerProvider>
            </GearPlannerProvider>
          </TroveProvider>
        </RansackProvider>
      </WishlistProvider>
    </BrowserRouter>
  )
}

export default App
