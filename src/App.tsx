import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Layout from '@/components/layout/Layout'
import { GearPlannerProvider } from '@/contexts/GearPlannerContext'
import { LfmProvider } from '@/contexts/LfmContext'
import { RansackProvider } from '@/contexts/RansackContext'
import { TRPlannerProvider } from '@/contexts/TRPlannerContext'
import { TroveProvider } from '@/contexts/TroveContext'
import { WishlistProvider } from '@/contexts/WishlistContext'
import Dashboard from '@/pages/Dashboard'
import GearPlanner from '@/pages/GearPlanner'
import GearPlannerDemo from '@/pages/GearPlannerDemo'
import ItemWiki from '@/pages/ItemWiki'
import TRPlanner from '@/pages/TRPlanner'
import Wishlist from '@/pages/Wishlist'

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
                      <Route path="/gear/wishlist" element={<Wishlist />} />
                      <Route path="/gear/planner" element={<GearPlanner />} />
                      <Route path="/gear/planner-demo" element={<GearPlannerDemo />} />
                      {/* Other tools */}
                      <Route path="/tr-planner" element={<TRPlanner />} />
                      {/* Redirects for backward compatibility */}
                      <Route path="/wiki" element={<Navigate to="/gear/wiki" replace />} />
                      <Route path="/wishlist" element={<Navigate to="/gear/wishlist" replace />} />
                      <Route path="/planner" element={<Navigate to="/gear/planner" replace />} />
                      <Route path="/planner-demo" element={<Navigate to="/gear/planner-demo" replace />} />
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
