import React from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Leads from './pages/Leads.jsx'
import Senders from './pages/Senders.jsx'
import Templates from './pages/Templates.jsx'
import Reports from './pages/Reports.jsx'
import EmailLog from './pages/EmailLog.jsx'

// HashRouter = works even when client build is served from any path
// (no server rewrites needed) - perfect for internal tooling.
export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/senders" element={<Senders />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/emails" element={<EmailLog />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  )
}
