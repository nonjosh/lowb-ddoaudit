import { BrowserRouter, Route, Routes } from 'react-router-dom'

import Layout from '@/components/layout/Layout'
import { GearPlannerProvider } from '@/contexts/GearPlannerContext'
import { LfmProvider } from '@/contexts/LfmContext'
import Dashboard from '@/pages/Dashboard'
import GearPlanner from '@/pages/GearPlanner'
import ItemWiki from '@/pages/ItemWiki'

function App() {
  return (
    <BrowserRouter>
      <GearPlannerProvider>
        <LfmProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/wiki" element={<ItemWiki />} />
              <Route path="/planner" element={<GearPlanner />} />
            </Routes>
          </Layout>
        </LfmProvider>
      </GearPlannerProvider>
    </BrowserRouter>
  )
}

export default App
