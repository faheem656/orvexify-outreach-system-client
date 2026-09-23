import React, { useState, useEffect } from 'react'
import styles from './App.module.css'
import './index.css'
import { API_BASE, apiUrl } from './config.js'
import LeadsTab from './components/LeadsTab.jsx'
import SendersTab from './components/SendersTab.jsx'
import TemplatesTab from './components/TemplatesTab.jsx'
import ReportsTab from './components/ReportsTab.jsx'

export default function App() {
  const [tab, setTab] = useState('leads')
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [stats, setStats] = useState(null)

  const fetchTemplates = async () => {
    try {
      const res = await fetch(apiUrl('/api/templates'))
      const text = await res.text()
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
        console.warn('API returned HTML - server may not be running at', API_BASE)
        return
      }
      const data = JSON.parse(text)
      setTemplates(data)
      if (data.length && !selectedTemplate) setSelectedTemplate(data[0])
    } catch (e) {
      console.error(`Failed to fetch templates from ${API_BASE} - is server running on :4000?`, e)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch(apiUrl('/api/stats'))
      const text = await res.text()
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
        console.warn('API returned HTML for stats - server not running?')
        return
      }
      const data = JSON.parse(text)
      setStats(data)
    } catch (e) {
      console.error('Failed to fetch stats - is server running?', e)
    }
  }

  useEffect(() => {
    fetchTemplates()
    fetchStats()
    const id = setInterval(() => { fetchStats(); fetchTemplates() }, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>O</div>
            <div className={styles.logoText}>
              <div className={styles.logoTitle}>Orvexify Mailing</div>
              <div className={styles.logoSub}>SMTP Only • Easy Setup • No IMAP</div>
            </div>
          </div>
          <div className={styles.statsPill}>
            <div className={styles.dot} style={{background: stats?.withinWindow===false ? '#ef4444' : '#10b981'}}></div>
            <span>{stats ? `${stats.totalSentToday}/${stats.totalCapacity} today • ${stats.pending} queued • ${stats.senderCount} senders` : 'Loading...'}</span>
            {stats?.estimatedDays > 0 && <span style={{background:'#eef2ff', color:'#4f46e5', padding:'2px 8px', borderRadius:20, fontWeight:700}}>{stats.estimatedDays}d left</span>}
            {stats?.withinWindow===false && <span style={{background:'#fee2e2', color:'#991b1b', padding:'2px 8px', borderRadius:20, fontWeight:700, fontSize:11}}>⏰ Outside {stats.sendWindow} - Use Force Send in Tab 3</span>}
            {stats?.withinWindow===true && <span style={{background:'#dcfce7', color:'#065f46', padding:'2px 8px', borderRadius:20, fontWeight:700, fontSize:11}}>✅ {stats.sendWindow} Active</span>}
          </div>
        </div>
      </header>

      <div className={styles.container}>
        <div className={styles.tabs}>
          <button onClick={()=>setTab('leads')} className={`${styles.tab} ${tab==='leads'?styles.tabActive:''}`}>👥 1. Leads Add</button>
          <button onClick={()=>setTab('senders')} className={`${styles.tab} ${tab==='senders'?styles.tabActive:''}`}>📧 2. Sender Emails & Limits</button>
          <button onClick={()=>setTab('templates')} className={`${styles.tab} ${tab==='templates'?styles.tabActive:''}`}>✉️ 3. Email Templates</button>
          <button onClick={()=>setTab('reports')} className={`${styles.tab} ${tab==='reports'?styles.tabActive:''}`}>📊 4. Reports - Bounce/Open/Click</button>
        </div>

        {tab==='leads' && <LeadsTab templates={templates} selectedTemplate={selectedTemplate} setSelectedTemplate={setSelectedTemplate} stats={stats} onUpdate={fetchStats} />}
        {tab==='senders' && <SendersTab onUpdate={fetchStats} />}
        {tab==='templates' && <TemplatesTab templates={templates} onCreated={fetchTemplates} selected={selectedTemplate} setSelected={setSelectedTemplate} />}
        {tab==='reports' && <ReportsTab templates={templates} stats={stats} />}
      </div>
    </div>
  )
}
