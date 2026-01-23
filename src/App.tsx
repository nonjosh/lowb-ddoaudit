import { BrowserRouter, Route, Routes } from 'react-router-dom'

import Layout from '@/components/layout/Layout'
import { GearPlannerProvider } from '@/contexts/GearPlannerContext'
import { LfmProvider } from '@/contexts/LfmContext'
import { RansackProvider } from '@/contexts/RansackContext'
import { TRPlannerProvider } from '@/contexts/TRPlannerContext'
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
          <GearPlannerProvider>
            <TRPlannerProvider>
              <LfmProvider>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/wiki" element={<ItemWiki />} />
                    <Route path="/planner" element={<GearPlanner />} />
                    <Route path="/planner-demo" element={<GearPlannerDemo />} />
                    <Route path="/wishlist" element={<Wishlist />} />
                    <Route path="/tr-planner" element={<TRPlanner />} />
                  </Routes>
                </Layout>
              </LfmProvider>
            </TRPlannerProvider>
          </GearPlannerProvider>
        </RansackProvider>
      </WishlistProvider>
    </BrowserRouter>
  )
}

export default App
