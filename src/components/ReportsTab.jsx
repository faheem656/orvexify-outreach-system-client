import React, { useState, useEffect, useRef, useCallback } from 'react'
import s from './Dashboard.module.css'
import ls from './LeadsTab.module.css'
import { apiUrl } from '../config.js'

export default function ReportsTab({ templates, stats }) {
  const [leads, setLeads] = useState([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [subFilter, setSubFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('all')
  const [page, setPage] = useState(0)
  const [cronStatus, setCronStatus] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [leadDetails, setLeadDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState(null)
  const [debugLoading, setDebugLoading] = useState(false)
  const [forceSendResult, setForceSendResult] = useState(null)
  const [countryFilter, setCountryFilter] = useState('all')

  // ===== HISTORY STATE =====
  const [historyData, setHistoryData] = useState(null)
  const [historyDays, setHistoryDays] = useState(30)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyTab, setHistoryTab] = useState('daily') // daily | sender | template | country | recent

  const LIMIT = 50

  const COUNTRY_OPTS = [
    {code:'US', flag:'🇺🇸', name:'USA'},
    {code:'GB', flag:'🇬🇧', name:'UK'},
    {code:'CA', flag:'🇨🇦', name:'Canada'},
    {code:'AU', flag:'🇦🇺', name:'Australia'},
    {code:'DE', flag:'🇩🇪', name:'Germany'},
    {code:'AE', flag:'🇦🇪', name:'UAE'},
    {code:'IN', flag:'🇮🇳', name:'India'},
    {code:'PK', flag:'🇵🇰', name:'Pakistan'},
  ]
  const observerRef = useRef(null)

  // ===== HISTORY LOADER =====
  const loadHistory = useCallback(async (days = 30) => {
    setHistoryLoading(true)
    try {
      const [dailyRes, senderRes, templateRes, countryRes, recentRes] = await Promise.all([
        fetch(apiUrl(`/api/history/daily?days=${days}`)),
        fetch(apiUrl(`/api/history/by-sender?days=${days}`)),
        fetch(apiUrl(`/api/history/by-template?days=${days}`)),
        fetch(apiUrl(`/api/history/by-country?days=${days}`)),
        fetch(apiUrl(`/api/history/recent?limit=50`))
      ])
      const [daily, bySender, byTemplate, byCountry, recent] = await Promise.all([
        dailyRes.json(), senderRes.json(), templateRes.json(), countryRes.json(), recentRes.json()
      ])
      setHistoryData({
        daily: daily.daily || [],
        totals: daily.totals || {},
        today: daily.today || {},
        bySender: bySender.bySender || [],
        byTemplate: byTemplate.byTemplate || [],
        byCountry: byCountry.byCountry || [],
        recent: recent.history || []
      })
    } catch(e) { console.error('loadHistory error', e) }
    setHistoryLoading(false)
  }, [])

  useEffect(()=>{ loadHistory(historyDays) }, [historyDays, loadHistory])

  const fetchCronStatus = async () => {
    try {
      const res = await fetch(apiUrl('/api/cron/status'))
      const data = await res.json()
      setCronStatus(data)
    } catch {}
  }
  useEffect(()=>{ fetchCronStatus(); const i=setInterval(fetchCronStatus, 30000); return ()=>clearInterval(i) }, [])

  const triggerCronNow = async () => {
    if (!confirm('Run auto-send NOW for all templates? (30 per template)')) return
    const res = await fetch(apiUrl('/api/cron/run-now'), { method:'POST' })
    const data = await res.json()
    alert(`✅ Cron triggered!\nLast run: ${data.lastCronRun}\nSent: ${data.lastCronResult?.totalSent||0}`)
    fetchCronStatus()
    loadHistory(historyDays)
    setPage(0); fetchReports(0,false)
  }

  const fixWindow = async () => {
    if (!confirm('Fix window to 0-23 (24h open) - Auto-send hamesha ACTIVE rahega?')) return
    try {
      const res = await fetch(apiUrl('/api/settings/fix-window'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ start:0, end:23 }) })
      const data = await res.json()
      alert(`✅ Window Fixed!\n${data.message || `Window ${data.start}-${data.end}`}\nWithin: ${data.withinWindow ? 'YES ACTIVE' : 'NO'}`)
      fetchCronStatus()
    } catch(e){ alert('Fix failed: '+e.message) }
  }

  const diagnoseWhyNotSending = async () => {
    setDebugLoading(true)
    try {
      const res = await fetch(apiUrl('/api/debug/why-not-sending'))
      const data = await res.json()
      setDebugInfo(data)
    } catch(e){ alert('Diagnose failed: '+e.message) }
    setDebugLoading(false)
  }

  const forceSendOne = async () => {
    if (!confirm('Send 1 pending lead NOW with full error details?')) return
    setDebugLoading(true)
    try {
      const res = await fetch(apiUrl('/api/debug/force-send-one'), { method:'POST' })
      const data = await res.json()
      setForceSendResult(data)
      setDebugInfo(null)
      if (data.ok) {
        alert(`✅ SUCCESS: Sent to ${data.lead?.email} via ${data.senderUsed}\nStatus now: ${data.lead?.status}`)
        fetchCronStatus()
        loadHistory(historyDays)
        setPage(0); fetchReports(0,false)
      } else {
        alert(`❌ FAILED: ${data.error || data.result?.reason}\n\nHint: ${data.hint || data.message}`)
        setDebugInfo({ issues:[data.error], fixes:[data.hint], checks: data })
      }
    } catch(e){ alert('Force send failed: '+e.message) }
    setDebugLoading(false)
  }

  const fetchReports = useCallback(async (pageNum=0, append=false) => {
    if (loading) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter!=='all') params.set('status', filter)
      if (subFilter==='sub') params.set('subscribed', 'true')
      if (subFilter==='unsub') params.set('subscribed', 'false')
      if (countryFilter!=='all') params.set('country', countryFilter)
      if (search) params.set('search', search)
      if (selectedTemplate!=='all') params.set('template_id', selectedTemplate)
      params.set('limit', LIMIT)
      params.set('offset', pageNum*LIMIT)
      const res = await fetch(apiUrl(`/api/reports?${params.toString()}`))
      const text = await res.text()
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) { setLoading(false); return }
      const data = JSON.parse(text)
      if (Array.isArray(data)) {
        setLeads(data); setTotal(data.length); setHasMore(false)
      } else {
        const newLeads = data.leads || []
        setTotal(data.total||0)
        setHasMore(data.hasMore||false)
        if (append) setLeads(prev=>[...prev, ...newLeads])
        else setLeads(newLeads)
      }
    } catch(e){ console.error(e) }
    setLoading(false)
  }, [filter, subFilter, search, selectedTemplate, countryFilter, loading])

  useEffect(()=>{ setPage(0); fetchReports(0,false) }, [filter, subFilter, selectedTemplate, countryFilter])
  useEffect(()=>{ if (search) { const t=setTimeout(()=>{ setPage(0); fetchReports(0,false) }, 400); return ()=>clearTimeout(t) } }, [search])

  const lastRef = useCallback(node=>{
    if (loading) return
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(entries=>{
      if (entries[0].isIntersecting && hasMore) {
        const next = page+1
        setPage(next)
        fetchReports(next, true)
      }
    })
    if (node) observerRef.current.observe(node)
  }, [loading, hasMore, page, fetchReports])

  const toggleSub = async (lead) => {
    const isSub = lead.is_subscribed!==0 && lead.status!=='unsubscribed'
    const action = isSub ? 'unsubscribe' : 'subscribe'
    if (!confirm(isSub ? `Unsub ${lead.email}?` : `Resub ${lead.email}?`)) return
    await fetch(apiUrl(`/api/leads/${lead.id}/${action}`), { method:'POST' })
    setLeads(prev=>prev.map(l=> l.id===lead.id ? {...l, is_subscribed: isSub?0:1, status: isSub?'unsubscribed':'pending'} : l))
    if (selectedLead && selectedLead.id===lead.id) {
      setSelectedLead(prev=>({...prev, is_subscribed: isSub?0:1, status: isSub?'unsubscribed':'pending'}))
    }
  }

  const openLeadDetails = async (lead) => {
    setSelectedLead(lead)
    setDetailsLoading(true)
    setLeadDetails(null)
    try {
      const res = await fetch(apiUrl(`/api/leads/${lead.id}/details`))
      const data = await res.json()
      setLeadDetails(data)
    } catch (e) { console.error(e) }
    setDetailsLoading(false)
  }

  const closeModal = () => {
    setSelectedLead(null)
    setLeadDetails(null)
  }

  const replyRate = stats?.totalSent ? ((stats.replied / stats.totalSent)*100).toFixed(1) : 0
  const bounceRate = stats?.totalSent ? ((stats.bounced / stats.totalSent)*100).toFixed(1) : 0
  const openRate = stats?.totalSent ? ((stats.opened / stats.totalSent)*100).toFixed(1) : 0
  const clickRate = stats?.totalSent ? ((stats.clicked / stats.totalSent)*100).toFixed(1) : 0

  // Helper: days slice
  const last7 = historyData?.daily?.slice(0,7).reduce((a,b)=>a+(b.sent||0),0) || 0
  const last30 = historyData?.daily?.slice(0,30).reduce((a,b)=>a+(b.sent||0),0) || 0

  return (
    <div style={{display:'grid', gap:16}}>

      {/* ===== AUTO-SEND STATUS ===== */}
      <div className={s.card} style={{background: cronStatus?.window?.withinWindow ? '#dcfce7' : '#fee2e2', borderColor: cronStatus?.window?.withinWindow ? '#86efac' : '#fecaca'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
          <div>
            <div style={{fontWeight:700, fontSize:13}}>⏰ Auto-Send Status - {cronStatus?.window?.withinWindow ? '✅ ACTIVE' : '❌ OUTSIDE WINDOW'}</div>
            <div style={{fontSize:11, marginTop:4, lineHeight:'1.6'}}>
              <span>Last Cron: {cronStatus?.lastCronRun ? new Date(cronStatus.lastCronRun).toLocaleString() : 'Never - will run in 10s'}</span><br/>
              <span>Last Result: {cronStatus?.lastCronResult ? `${cronStatus.lastCronResult.totalSent} sent` : 'Waiting...'} | Pending: {cronStatus?.stats?.pending||0}</span><br/>
              <span>Window: {cronStatus?.window?.start||0}:00-{cronStatus?.window?.end||23}:00 {cronStatus?.window?.timezone} | Within: {cronStatus?.window?.withinWindow ? 'YES' : 'NO'}</span><br/>
              <span>Senders: {cronStatus?.senders?.map(s=>`${s.smtp_user} ${s.sent_today}/${s.daily_limit}`).join(', ')}</span>
            </div>
          </div>
          <div style={{display:'flex', gap:8, flexDirection:'column'}}>
            <button onClick={fixWindow} style={{padding:'8px 14px', borderRadius:8, background:'#dc2626', color:'white', border:'none', fontWeight:700, fontSize:11, cursor:'pointer'}}>🔧 Fix Window to 0-23</button>
            <button onClick={triggerCronNow} style={{padding:'8px 14px', borderRadius:8, background:'#065f46', color:'white', border:'none', fontWeight:700, fontSize:12, cursor:'pointer'}}>🚀 Run Auto-Send NOW (30)</button>
            <button onClick={forceSendOne} disabled={debugLoading} style={{padding:'8px 14px', borderRadius:8, background:'#7c3aed', color:'white', border:'none', fontWeight:700, fontSize:11, cursor:'pointer'}}>{debugLoading ? '⏳ Testing...' : '🧪 Force Send 1 Lead Test'}</button>
            <button onClick={diagnoseWhyNotSending} disabled={debugLoading} style={{padding:'8px 14px', borderRadius:8, background:'#ea580c', color:'white', border:'none', fontWeight:700, fontSize:11, cursor:'pointer'}}>{debugLoading ? '⏳ Diagnosing...' : '🔍 Why Not Sending?'}</button>
            <button onClick={fetchCronStatus} style={{padding:'6px 12px', borderRadius:8, background:'white', border:'1px solid #e5e7eb', fontSize:11, cursor:'pointer'}}>🔄 Refresh</button>
          </div>
        </div>

        {debugInfo && (
          <div style={{marginTop:14, background: debugInfo.ok ? '#dcfce7' : '#fee2e2', border:'1px solid', borderColor: debugInfo.ok ? '#86efac' : '#fecaca', padding:14, borderRadius:10}}>
            <div style={{fontWeight:800, fontSize:13}}>{debugInfo.summary}</div>
            {debugInfo.issues?.length>0 && (
              <div style={{marginTop:10}}>
                <div style={{fontWeight:700, fontSize:11, color:'#991b1b'}}>❌ Issues:</div>
                {debugInfo.issues.map((iss,i)=><div key={i} style={{fontSize:11, marginTop:4, background:'white', padding:'6px 10px', borderRadius:6, border:'1px solid #fecaca'}}>{iss}</div>)}
              </div>
            )}
            {debugInfo.fixes?.length>0 && (
              <div style={{marginTop:10}}>
                <div style={{fontWeight:700, fontSize:11, color:'#065f46'}}>✅ Fixes:</div>
                {debugInfo.fixes.map((fix,i)=><div key={i} style={{fontSize:11, marginTop:4, background:'white', padding:'6px 10px', borderRadius:6, border:'1px solid #86efac'}}>{fix}</div>)}
              </div>
            )}
            <button onClick={()=>setDebugInfo(null)} style={{marginTop:10, padding:'4px 10px', borderRadius:6, border:'1px solid #e5e7eb', background:'white', fontSize:10, cursor:'pointer'}}>✕ Close</button>
          </div>
        )}

        {forceSendResult && (
          <div style={{marginTop:14, background: forceSendResult.ok ? '#dcfce7' : '#fee2e2', border:'1px solid', borderColor: forceSendResult.ok ? '#86efac' : '#fecaca', padding:14, borderRadius:10}}>
            <div style={{fontWeight:800, fontSize:12}}>{forceSendResult.message}</div>
            <div style={{fontSize:11, marginTop:8, background:'white', padding:10, borderRadius:8}}>
              <div><b>Lead:</b> {forceSendResult.lead?.email} - Status: {forceSendResult.lead?.status} - Sender: {forceSendResult.lead?.sender_email || forceSendResult.senderUsed}</div>
              <div style={{marginTop:6, color: forceSendResult.ok ? '#065f46' : '#991b1b'}}><b>Hint:</b> {forceSendResult.hint}</div>
            </div>
            <button onClick={()=>setForceSendResult(null)} style={{marginTop:10, padding:'4px 10px', borderRadius:6, border:'1px solid #e5e7eb', background:'white', fontSize:10, cursor:'pointer'}}>✕ Close</button>
          </div>
        )}
      </div>

      {/* ===== NEW: HISTORICAL DATA - ALL TIME ===== */}
      <div className={s.card} style={{background:'linear-gradient(135deg,#f0f9ff 0%,#eef2ff 100%)', border:'1px solid #c7d2fe'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
          <div>
            <div style={{fontWeight:800, fontSize:14, color:'#1e40af'}}>📊 Sending History - Permanent Record</div>
            <div style={{fontSize:11, color:'#4338ca', marginTop:2}}>Har email ka all-time record - kal, parson, mahine pehle - sab save rehta hai</div>
          </div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <select value={historyDays} onChange={e=>setHistoryDays(parseInt(e.target.value))} style={{padding:'6px 10px', borderRadius:8, border:'1px solid #c7d2fe', background:'white', fontSize:12, fontWeight:600}}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
            <button onClick={()=>loadHistory(historyDays)} disabled={historyLoading} style={{padding:'6px 12px', borderRadius:8, border:'1px solid #c7d2fe', background:'white', fontSize:12, fontWeight:600, cursor:'pointer'}}>{historyLoading ? '⏳' : '🔄'} Refresh</button>
          </div>
        </div>

        {/* Snapshot cards */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginTop:14}}>
          <div style={{background:'white', padding:12, borderRadius:10, border:'1px solid #bfdbfe'}}>
            <div style={{fontSize:10, color:'#6b7280', fontWeight:600, textTransform:'uppercase'}}>Today Sent</div>
            <div style={{fontWeight:800, fontSize:20, color:'#059669', marginTop:2}}>{historyData?.today?.sent || 0}</div>
            <div style={{fontSize:10, color:'#9ca3af'}}>{historyData?.today?.failed || 0} failed</div>
          </div>
          <div style={{background:'white', padding:12, borderRadius:10, border:'1px solid #bfdbfe'}}>
            <div style={{fontSize:10, color:'#6b7280', fontWeight:600, textTransform:'uppercase'}}>Last 7 Days</div>
            <div style={{fontWeight:800, fontSize:20, color:'#4f46e5', marginTop:2}}>{last7}</div>
            <div style={{fontSize:10, color:'#9ca3af'}}>sent</div>
          </div>
          <div style={{background:'white', padding:12, borderRadius:10, border:'1px solid #bfdbfe'}}>
            <div style={{fontSize:10, color:'#6b7280', fontWeight:600, textTransform:'uppercase'}}>Last 30 Days</div>
            <div style={{fontWeight:800, fontSize:20, color:'#7c3aed', marginTop:2}}>{last30}</div>
            <div style={{fontSize:10, color:'#9ca3af'}}>sent</div>
          </div>
          <div style={{background:'white', padding:12, borderRadius:10, border:'1px solid #bfdbfe'}}>
            <div style={{fontSize:10, color:'#6b7280', fontWeight:600, textTransform:'uppercase'}}>All Time</div>
            <div style={{fontWeight:800, fontSize:20, color:'#111827', marginTop:2}}>{historyData?.totals?.sent_all_time || 0}</div>
            <div style={{fontSize:10, color:'#9ca3af'}}>{historyData?.totals?.failed_all_time || 0} failed</div>
          </div>
        </div>

        {/* Step breakdown */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginTop:10}}>
          <div style={{background:'#f0fdf4', padding:12, borderRadius:10, border:'1px solid #bbf7d0'}}>
            <div style={{fontSize:10, color:'#065f46', fontWeight:700, textTransform:'uppercase'}}>✉️ Initial Sent</div>
            <div style={{fontWeight:800, fontSize:18, color:'#065f46', marginTop:2}}>{historyData?.totals?.initial_all_time || 0}</div>
            <div style={{fontSize:10, color:'#047857'}}>Day 0</div>
          </div>
          <div style={{background:'#eff6ff', padding:12, borderRadius:10, border:'1px solid #bfdbfe'}}>
            <div style={{fontSize:10, color:'#1e40af', fontWeight:700, textTransform:'uppercase'}}>🔄 Follow-up 1</div>
            <div style={{fontWeight:800, fontSize:18, color:'#1e40af', marginTop:2}}>{historyData?.totals?.followup1_all_time || 0}</div>
            <div style={{fontSize:10, color:'#1d4ed8'}}>Not-opened bump</div>
          </div>
          <div style={{background:'#fef3c7', padding:12, borderRadius:10, border:'1px solid #fde68a'}}>
            <div style={{fontSize:10, color:'#92400e', fontWeight:700, textTransform:'uppercase'}}>🔄 Follow-up 2</div>
            <div style={{fontWeight:800, fontSize:18, color:'#92400e', marginTop:2}}>{historyData?.totals?.followup2_all_time || 0}</div>
            <div style={{fontSize:10, color:'#b45309'}}>Opened no click</div>
          </div>
          <div style={{background:'#fce7f3', padding:12, borderRadius:10, border:'1px solid #fbcfe8'}}>
            <div style={{fontSize:10, color:'#9d174d', fontWeight:700, textTransform:'uppercase'}}>🔄 Follow-up 3</div>
            <div style={{fontWeight:800, fontSize:18, color:'#9d174d', marginTop:2}}>{historyData?.totals?.followup3_all_time || 0}</div>
            <div style={{fontSize:10, color:'#be185d'}}>Break-up</div>
          </div>
        </div>

        {/* History Tab Switcher */}
        <div style={{display:'flex', gap:6, marginTop:16, flexWrap:'wrap', borderBottom:'1px solid #c7d2fe', paddingBottom:0}}>
          {[
            {k:'daily', label:'📅 Daily'},
            {k:'sender', label:'📧 By Sender'},
            {k:'template', label:'✉️ By Template'},
            {k:'country', label:'🌍 By Country'},
            {k:'recent', label:'🕐 Recent 50'}
          ].map(t=>(
            <button key={t.k} onClick={()=>setHistoryTab(t.k)} style={{
              padding:'8px 14px', borderRadius:'8px 8px 0 0', border:'1px solid #c7d2fe', borderBottom:'none',
              background: historyTab===t.k ? 'white' : 'transparent',
              color: historyTab===t.k ? '#1e40af' : '#6b7280',
              fontWeight:700, fontSize:12, cursor:'pointer',
              marginBottom: historyTab===t.k ? '-1px' : '0'
            }}>{t.label}</button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div style={{background:'white', borderRadius:'0 10px 10px 10px', border:'1px solid #c7d2fe', borderTop:'none', maxHeight:400, overflowY:'auto'}}>

          {/* DAILY */}
          {historyTab==='daily' && (
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
              <thead style={{position:'sticky', top:0, background:'#f9fafb', zIndex:1}}>
                <tr>
                  <th style={{textAlign:'left', padding:'8px 12px', fontWeight:700, fontSize:10, textTransform:'uppercase', color:'#6b7280', borderBottom:'1px solid #e5e7eb'}}>Date</th>
                  <th style={{textAlign:'center', padding:'8px 12px', fontWeight:700, fontSize:10, textTransform:'uppercase', color:'#6b7280', borderBottom:'1px solid #e5e7eb'}}>Total</th>
                  <th style={{textAlign:'center', padding:'8px 12px', fontWeight:700, fontSize:10, textTransform:'uppercase', color:'#059669', borderBottom:'1px solid #e5e7eb'}}>✓ Sent</th>
                  <th style={{textAlign:'center', padding:'8px 12px', fontWeight:700, fontSize:10, textTransform:'uppercase', color:'#dc2626', borderBottom:'1px solid #e5e7eb'}}>✗ Failed</th>
                  <th style={{textAlign:'center', padding:'8px 12px', fontWeight:700, fontSize:10, textTransform:'uppercase', color:'#065f46', borderBottom:'1px solid #e5e7eb'}}>Init</th>
                  <th style={{textAlign:'center', padding:'8px 12px', fontWeight:700, fontSize:10, textTransform:'uppercase', color:'#1e40af', borderBottom:'1px solid #e5e7eb'}}>F1</th>
                  <th style={{textAlign:'center', padding:'8px 12px', fontWeight:700, fontSize:10, textTransform:'uppercase', color:'#92400e', borderBottom:'1px solid #e5e7eb'}}>F2</th>
                  <th style={{textAlign:'center', padding:'8px 12px', fontWeight:700, fontSize:10, textTransform:'uppercase', color:'#9d174d', borderBottom:'1px solid #e5e7eb'}}>F3</th>
                </tr>
              </thead>
              <tbody>
                {historyData?.daily?.map(d=>(
                  <tr key={d.date_ymd} style={{borderBottom:'1px solid #f3f4f6'}}>
                    <td style={{padding:'8px 12px', fontWeight:600}}>{d.date_ymd}</td>
                    <td style={{padding:'8px 12px', textAlign:'center', fontWeight:700}}>{d.total}</td>
                    <td style={{padding:'8px 12px', textAlign:'center', color:'#059669', fontWeight:700}}>{d.sent}</td>
                    <td style={{padding:'8px 12px', textAlign:'center', color:'#dc2626', fontWeight:600}}>{d.failed || 0}</td>
                    <td style={{padding:'8px 12px', textAlign:'center', color:'#065f46'}}>{d.initial_sent || 0}</td>
                    <td style={{padding:'8px 12px', textAlign:'center', color:'#1e40af'}}>{d.followup1_sent || 0}</td>
                    <td style={{padding:'8px 12px', textAlign:'center', color:'#92400e'}}>{d.followup2_sent || 0}</td>
                    <td style={{padding:'8px 12px', textAlign:'center', color:'#9d174d'}}>{d.followup3_sent || 0}</td>
                  </tr>
                ))}
                {(!historyData?.daily || historyData.daily.length === 0) && (
                  <tr><td colSpan={8} style={{padding:20, textAlign:'center', color:'#9ca3af', fontSize:12}}>No history yet. Send some emails first.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {/* BY SENDER */}
          {historyTab==='sender' && (
            <div>
              {historyData?.bySender?.map(sd=>(
                <div key={sd.sender_email} style={{padding:'10px 14px', borderBottom:'1px solid #f3f4f6', fontSize:11}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap'}}>
                    <div style={{fontWeight:700, color:'#111827', wordBreak:'break-all', flex:1}}>📧 {sd.sender_email}</div>
                    <div style={{display:'flex', gap:10, fontSize:11, fontWeight:700}}>
                      <span style={{color:'#059669'}}>✓ {sd.sent}</span>
                      <span style={{color:'#dc2626'}}>✗ {sd.failed}</span>
                      <span style={{color:'#6b7280'}}>Total {sd.total}</span>
                    </div>
                  </div>
                  <div style={{display:'flex', gap:10, marginTop:6, fontSize:10, color:'#6b7280', flexWrap:'wrap'}}>
                    <span>Initial: <b style={{color:'#065f46'}}>{sd.initial_sent}</b></span>
                    <span>F1: <b style={{color:'#1e40af'}}>{sd.followup1_sent}</b></span>
                    <span>F2: <b style={{color:'#92400e'}}>{sd.followup2_sent}</b></span>
                    <span>F3: <b style={{color:'#9d174d'}}>{sd.followup3_sent}</b></span>
                    <span style={{marginLeft:'auto'}}>Last: {sd.last_send_date || '-'}</span>
                  </div>
                </div>
              ))}
              {(!historyData?.bySender || historyData.bySender.length === 0) && (
                <div style={{padding:20, textAlign:'center', color:'#9ca3af', fontSize:12}}>No sender data yet.</div>
              )}
            </div>
          )}

          {/* BY TEMPLATE */}
          {historyTab==='template' && (
            <div>
              {historyData?.byTemplate?.map(t=>(
                <div key={t.template_id} style={{padding:'10px 14px', borderBottom:'1px solid #f3f4f6', fontSize:11}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap'}}>
                    <div style={{fontWeight:700, color:'#111827', flex:1}}>✉️ {t.template_name || 'Unknown Template'}</div>
                    <div style={{display:'flex', gap:10, fontSize:11, fontWeight:700}}>
                      <span style={{color:'#059669'}}>✓ {t.sent}</span>
                      <span style={{color:'#dc2626'}}>✗ {t.failed}</span>
                      <span style={{color:'#6b7280'}}>Total {t.total}</span>
                    </div>
                  </div>
                  <div style={{display:'flex', gap:10, marginTop:6, fontSize:10, color:'#6b7280', flexWrap:'wrap'}}>
                    <span>Initial: <b style={{color:'#065f46'}}>{t.initial_sent}</b></span>
                    <span>F1: <b style={{color:'#1e40af'}}>{t.followup1_sent}</b></span>
                    <span>F2: <b style={{color:'#92400e'}}>{t.followup2_sent}</b></span>
                    <span>F3: <b style={{color:'#9d174d'}}>{t.followup3_sent}</b></span>
                  </div>
                </div>
              ))}
              {(!historyData?.byTemplate || historyData.byTemplate.length === 0) && (
                <div style={{padding:20, textAlign:'center', color:'#9ca3af', fontSize:12}}>No template data yet.</div>
              )}
            </div>
          )}

          {/* BY COUNTRY */}
          {historyTab==='country' && (
            <div>
              {historyData?.byCountry?.map(c=>(
                <div key={c.country_code} style={{padding:'10px 14px', borderBottom:'1px solid #f3f4f6', fontSize:11, display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap'}}>
                  <span style={{fontWeight:700}}>{c.flag} {c.country_code} - {c.country}</span>
                  <span style={{display:'flex', gap:12, fontWeight:700}}>
                    <span style={{color:'#059669'}}>✓ {c.sent}</span>
                    <span style={{color:'#dc2626'}}>✗ {c.failed}</span>
                    <span style={{color:'#6b7280'}}>Total {c.total}</span>
                  </span>
                </div>
              ))}
              {(!historyData?.byCountry || historyData.byCountry.length === 0) && (
                <div style={{padding:20, textAlign:'center', color:'#9ca3af', fontSize:12}}>No country data yet.</div>
              )}
            </div>
          )}

          {/* RECENT 50 */}
          {historyTab==='recent' && (
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
              <thead style={{position:'sticky', top:0, background:'#f9fafb', zIndex:1}}>
                <tr>
                  <th style={{textAlign:'left', padding:'8px 12px', fontWeight:700, fontSize:10, textTransform:'uppercase', color:'#6b7280', borderBottom:'1px solid #e5e7eb'}}>Time</th>
                  <th style={{textAlign:'left', padding:'8px 12px', fontWeight:700, fontSize:10, textTransform:'uppercase', color:'#6b7280', borderBottom:'1px solid #e5e7eb'}}>To</th>
                  <th style={{textAlign:'center', padding:'8px 12px', fontWeight:700, fontSize:10, textTransform:'uppercase', color:'#6b7280', borderBottom:'1px solid #e5e7eb'}}>Step</th>
                  <th style={{textAlign:'left', padding:'8px 12px', fontWeight:700, fontSize:10, textTransform:'uppercase', color:'#6b7280', borderBottom:'1px solid #e5e7eb'}}>Sender</th>
                  <th style={{textAlign:'center', padding:'8px 12px', fontWeight:700, fontSize:10, textTransform:'uppercase', color:'#6b7280', borderBottom:'1px solid #e5e7eb'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {historyData?.recent?.map(h=>(
                  <tr key={h.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                    <td style={{padding:'6px 12px', fontSize:10, color:'#6b7280'}}>{h.sent_at ? new Date(h.sent_at).toLocaleString() : '-'}</td>
                    <td style={{padding:'6px 12px', fontSize:10, fontWeight:600, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis'}}>{h.lead_email}</td>
                    <td style={{padding:'6px 12px', textAlign:'center', fontSize:10, fontWeight:700, color: h.step===0 ? '#065f46' : h.step===1 ? '#1e40af' : h.step===2 ? '#92400e' : '#9d174d'}}>{h.step_type || `step_${h.step}`}</td>
                    <td style={{padding:'6px 12px', fontSize:10, color:'#6b7280', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis'}}>{h.sender_email}</td>
                    <td style={{padding:'6px 12px', textAlign:'center'}}>
                      <span style={{
                        padding:'2px 8px', borderRadius:20, fontSize:9, fontWeight:700,
                        background: h.status==='sent' ? '#dcfce7' : '#fee2e2',
                        color: h.status==='sent' ? '#065f46' : '#991b1b'
                      }}>{h.status}</span>
                    </td>
                  </tr>
                ))}
                {(!historyData?.recent || historyData.recent.length === 0) && (
                  <tr><td colSpan={5} style={{padding:20, textAlign:'center', color:'#9ca3af', fontSize:12}}>No recent sends.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ===== STATS GRID ===== */}
      <div className={s.grid4}>
        <div className={s.card}><div className={s.label}>Total Leads / Sub / Unsub</div><div className={s.value}>{stats?.totalLeads||0}</div><div className={s.sub}>✅ {stats?.subscribed||0} sub • ❌ {stats?.unsubscribed||0} unsub</div></div>
        <div className={s.card}><div className={s.label}>Sent Today / Capacity</div><div className={s.value}>{stats?.totalSentToday||0} / {stats?.totalCapacity||0}</div><div className={s.sub}>{stats?.senderCount||0} senders • {stats?.totalSent||0} total sent • {stats?.pending||0} pending</div></div>
        <div className={s.card}><div className={s.label}>Bounce / Open / Click</div><div style={{fontSize:14, fontWeight:700, lineHeight:'1.6'}}><span style={{color: bounceRate>2 ? '#ef4444' : '#6b7280'}}>Bounced {stats?.bounced||0} ({bounceRate}%)</span><br/><span>Opened {stats?.opened||0} ({openRate}%)</span><br/><span style={{color:'#6b21a8'}}>Clicked {stats?.clicked||0} ({clickRate}%) 🔥</span></div></div>
        <div className={s.card}><div className={s.label}>Replied - KPI</div><div className={s.value} style={{color:'#065f46'}}>{stats?.replied||0} <span style={{fontSize:14}}>({replyRate}%)</span></div><div className={s.sub}>{replyRate>3 ? '✅ Good' : '⚠️ Improve'}</div></div>
      </div>

      {/* ===== LEAD TABLE ===== */}
      <div className={ls.card}>
        <div className={ls.header}>
          <div><div className={ls.title}>📊 Tab 4: Reports - Country 🌍 + Sender + Modal + History</div><div style={{fontSize:11, color:'#6b7280'}}>Click any row for full detail modal with sending history. Total {total} loaded {leads.length}</div></div>
          <div className={ls.controls} style={{flexWrap:'wrap'}}>
            <select className={ls.select} value={selectedTemplate} onChange={e=>setSelectedTemplate(e.target.value)} style={{width:140}}>
              <option value="all">All Templates</option>
              {templates.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className={ls.select} value={countryFilter} onChange={e=>setCountryFilter(e.target.value)} style={{width:120}}>
              <option value="all">All Countries</option>
              {COUNTRY_OPTS.map(c=> <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
            </select>
            <select className={ls.select} value={subFilter} onChange={e=>setSubFilter(e.target.value)} style={{width:100}}>
              <option value="all">All Sub</option><option value="sub">✅ Sub</option><option value="unsub">❌ Unsub</option>
            </select>
            <input className={ls.input} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:120}} />
            <button onClick={()=>{ setPage(0); fetchReports(0,false)}} className={ls.btnGhost}>🔄 Refresh</button>
          </div>
        </div>

        <div style={{display:'flex', gap:6, marginTop:12, flexWrap:'wrap'}}>
          {['all','pending','sent','opened','clicked','replied','bounced','unsubscribed'].map(st=>(
            <button key={st} onClick={()=>setFilter(st)} className={`${ls.btnGhost} ${filter===st ? ls.btnGhostActive : ''}`} style={{textTransform:'capitalize', fontSize:11}}>{st}</button>
          ))}
        </div>

        <div className={`${ls.card} ${ls.tableWrap}`} style={{marginTop:14, padding:0, maxHeight:'650px', overflowY:'auto'}} onScroll={e=>{
          const { scrollTop, scrollHeight, clientHeight } = e.target
          if (scrollHeight - scrollTop <= clientHeight + 150 && hasMore && !loading) {
            const next = page+1
            setPage(next)
            fetchReports(next, true)
          }
        }}>
          <div className={ls.tableScroll}>
            <table className={ls.table}>
              <thead style={{position:'sticky', top:0, background:'white', zIndex:1}}><tr><th>Email</th><th>Name</th><th>🌍 Country</th><th>Company</th><th>Template</th><th>Status</th><th>Sub</th><th>Local Time</th><th>Opens</th><th>Clicks</th><th>Sender</th></tr></thead>
              <tbody>
                {leads.map((l, idx)=>{
                  const isLast = idx===leads.length-1
                  const isSub = l.is_subscribed!==0 && l.status!=='unsubscribed'
                  return (
                    <tr key={l.id} ref={isLast ? lastRef : null} style={{background: isSub ? 'transparent' : '#fef2f2', cursor:'pointer'}} onClick={()=>openLeadDetails(l)}>
                      <td style={{fontWeight:600, fontSize:11}}>{l.email}</td>
                      <td style={{fontSize:11}}>{l.first_name} {l.last_name}</td>
                      <td style={{fontSize:11, fontWeight:700}}>{l.flag||'🇺🇸'} {l.country||'USA'} ({l.country_code||'US'})<br/><span style={{fontSize:9, color:'#6b7280'}}>{l.timezone||'America/New_York'}</span></td>
                      <td style={{maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', fontSize:11, fontWeight:600}}>{l.clinic_name || JSON.parse(l.custom_json||'{}').company_name || '-'}</td>
                      <td style={{fontSize:10}}>{l.template_name||'-'}</td>
                      <td><span className={`${ls.badge} ${l.status==='pending'?ls.badgePending:l.status==='sent'?ls.badgeSent:l.status==='opened'?ls.badgeOpened:l.status==='clicked'?ls.badgeClicked:l.status==='replied'?ls.badgeReplied:l.status==='bounced'?ls.badgeBounced:ls.badgeUnsub}`} style={{fontSize:9}}>{l.status}</span></td>
                      <td><span style={{padding:'2px 6px', borderRadius:20, background: isSub ? '#dcfce7' : '#fee2e2', color: isSub ? '#065f46' : '#991b1b', fontSize:9, fontWeight:700}}>{isSub ? '✅ Sub' : '❌ Unsub'}</span></td>
                      <td style={{fontSize:10, color: l.withinWindow ? '#065f46' : '#991b1b', fontWeight:600}}>{l.localTime||'-'}<br/><span style={{fontSize:8}}>{l.withinWindow ? '✅ Within' : '❌ Outside'}</span></td>
                      <td style={{color: l.open_count>0 ? '#4338ca' : '#9ca3af', fontSize:11, fontWeight: l.open_count>0 ? 700 : 400}}>{l.open_count}</td>
                      <td style={{color: l.click_count>0 ? '#6b21a8' : '#9ca3af', fontSize:11, fontWeight: l.click_count>0 ? 800 : 400}}>{l.click_count}</td>
                      <td style={{fontSize:10, fontWeight:600, color: l.sender_email ? '#065f46' : '#9ca3af'}}>{l.sender_email || (l.assigned_sender_id ? `${l.assigned_sender_id.slice(0,8)}...` : 'Pending')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {loading && <div style={{padding:12, textAlign:'center', fontSize:12}}>⏳ Loading {LIMIT} more...</div>}
            {!loading && hasMore && <div style={{padding:10, textAlign:'center', fontSize:11, color:'#9ca3af'}}>Scroll down for more - {total - leads.length} remaining</div>}
            {!loading && !hasMore && leads.length>0 && <div style={{padding:10, textAlign:'center', fontSize:11, color:'#059669'}}>✅ All {total} loaded - click row for details</div>}
            {leads.length===0 && !loading && <div style={{padding:30, textAlign:'center', color:'#9ca3af', fontSize:12}}>No data. Add leads in Tab 1</div>}
          </div>
        </div>
      </div>

      {/* ===== DETAIL MODAL ===== */}
      {selectedLead && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20}} onClick={closeModal}>
          <div style={{background:'white', borderRadius:16, maxWidth:750, width:'100%', maxHeight:'90vh', overflowY:'auto', padding:24, boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
              <div style={{fontWeight:700, fontSize:16}}>📧 Lead Detail - {selectedLead.email}</div>
              <button onClick={closeModal} style={{padding:'6px 12px', borderRadius:8, border:'1px solid #e5e7eb', background:'white', cursor:'pointer'}}>✕ Close</button>
            </div>

            {detailsLoading && <div style={{padding:20, textAlign:'center'}}>⏳ Loading details...</div>}

            {leadDetails && (
              <div style={{display:'grid', gap:16}}>

                {/* Main info */}
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12}}>
                  <div style={{background:'#f9fafb', padding:12, borderRadius:10, border:'1px solid #e5e7eb'}}>
                    <div style={{fontSize:10, color:'#6b7280', fontWeight:600}}>EMAIL</div>
                    <div style={{fontWeight:700, fontSize:13, marginTop:4, wordBreak:'break-all'}}>{leadDetails.lead.email}</div>
                  </div>
                  <div style={{background:'#f9fafb', padding:12, borderRadius:10, border:'1px solid #e5e7eb'}}>
                    <div style={{fontSize:10, color:'#6b7280', fontWeight:600}}>NAME</div>
                    <div style={{fontWeight:600, fontSize:13, marginTop:4}}>{leadDetails.lead.first_name} {leadDetails.lead.last_name} {leadDetails.custom.Title ? `(${leadDetails.custom.Title})` : ''}</div>
                  </div>
                  <div style={{background:'#f9fafb', padding:12, borderRadius:10, border:'1px solid #e5e7eb'}}>
                    <div style={{fontSize:10, color:'#6b7280', fontWeight:600}}>COMPANY</div>
                    <div style={{fontWeight:700, fontSize:13, marginTop:4}}>{leadDetails.lead.clinic_name || leadDetails.custom['Company Name'] || '-'}</div>
                  </div>
                  <div style={{background: leadDetails.lead.status==='sent' ? '#dcfce7' : leadDetails.lead.status==='pending' ? '#fef3c7' : leadDetails.lead.status==='bounced' ? '#fee2e2' : '#eef2ff', padding:12, borderRadius:10, border:'1px solid #e5e7eb'}}>
                    <div style={{fontSize:10, color:'#6b7280', fontWeight:600}}>STATUS</div>
                    <div style={{fontWeight:800, fontSize:14, marginTop:4, textTransform:'uppercase'}}>{leadDetails.lead.status}</div>
                    <div style={{fontSize:10, marginTop:2}}>Step {leadDetails.lead.current_step}/4</div>
                  </div>
                </div>

                {/* Sender info */}
                <div style={{background: leadDetails.lead.sender_email ? '#dcfce7' : '#fef3c7', padding:14, borderRadius:12, border:'1px solid', borderColor: leadDetails.lead.sender_email ? '#86efac' : '#fde68a'}}>
                  <div style={{fontWeight:700, fontSize:12}}>📤 Sender - Kis mail se send hui?</div>
                  {leadDetails.lead.sender_email ? (
                    <div style={{marginTop:8, fontSize:12, lineHeight:'1.6'}}>
                      <div><b>From:</b> {leadDetails.lead.sender_from_name} &lt;{leadDetails.lead.sender_email}&gt;</div>
                      <div><b>Host:</b> {leadDetails.lead.smtp_host}:{leadDetails.lead.smtp_port}</div>
                    </div>
                  ) : (
                    <div style={{marginTop:8, fontSize:12, color:'#92400e'}}>
                      ⏳ Abhi tak send nahi hui - status pending. Auto-send har 5 min me bhejega ya Send Now dabao.
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10}}>
                  <div style={{background:'white', border:'1px solid #e5e7eb', padding:10, borderRadius:8, textAlign:'center'}}>
                    <div style={{fontSize:20, fontWeight:800, color: leadDetails.lead.open_count>0 ? '#4f46e5' : '#9ca3af'}}>{leadDetails.lead.open_count}</div>
                    <div style={{fontSize:10, color:'#6b7280'}}>OPENS</div>
                  </div>
                  <div style={{background:'white', border:'1px solid #e5e7eb', padding:10, borderRadius:8, textAlign:'center'}}>
                    <div style={{fontSize:20, fontWeight:800, color: leadDetails.lead.click_count>0 ? '#7c3aed' : '#9ca3af'}}>{leadDetails.lead.click_count}</div>
                    <div style={{fontSize:10, color:'#6b7280'}}>CLICKS</div>
                  </div>
                  <div style={{background:'white', border:'1px solid #e5e7eb', padding:10, borderRadius:8, textAlign:'center'}}>
                    <div style={{fontSize:12, fontWeight:700}}>{leadDetails.lead.status}</div>
                    <div style={{fontSize:10, color:'#6b7280'}}>STATUS</div>
                  </div>
                  <div style={{background:'white', border:'1px solid #e5e7eb', padding:10, borderRadius:8, textAlign:'center'}}>
                    <div style={{fontSize:12, fontWeight:700}}>{leadDetails.lead.is_subscribed ? '✅ Sub' : '❌ Unsub'}</div>
                    <div style={{fontSize:10, color:'#6b7280'}}>SUB</div>
                  </div>
                </div>

                {/* NEW: Full Sending History */}
                <div style={{background:'#eff6ff', padding:14, borderRadius:10, border:'1px solid #bfdbfe'}}>
                  <div style={{fontWeight:700, fontSize:12, color:'#1e40af'}}>📜 Full Sending History (Permanent Record)</div>
                  {(!leadDetails.sendingHistory || leadDetails.sendingHistory.length === 0) && (
                    <div style={{fontSize:11, color:'#9ca3af', marginTop:8}}>No sends recorded yet for this lead.</div>
                  )}
                  {leadDetails.sendingHistory?.map((h, i)=>(
                    <div key={h.id || i} style={{marginTop:8, fontSize:11, background:'white', padding:'10px 12px', borderRadius:8, border:'1px solid #e5e7eb'}}>
                      <div style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}>
                        <span style={{
                          fontWeight:700, textTransform:'uppercase', fontSize:10,
                          padding:'2px 8px', borderRadius:20,
                          background: h.status === 'sent' ? '#dcfce7' : '#fee2e2',
                          color: h.status === 'sent' ? '#065f46' : '#991b1b'
                        }}>{h.status}</span>
                        <span style={{fontWeight:700, color:'#4338ca'}}>{h.step_type || `step_${h.step}`}</span>
                        <span style={{color:'#6b7280'}}>{h.sent_at ? new Date(h.sent_at).toLocaleString() : '-'}</span>
                        <span style={{marginLeft:'auto', color:'#065f46', fontWeight:600}}>via {h.sender_email}</span>
                      </div>
                      {h.subject && <div style={{marginTop:4, color:'#374151'}}><b>Subject:</b> {h.subject}</div>}
                      {h.error_reason && <div style={{marginTop:4, color:'#991b1b', background:'#fef2f2', padding:'4px 8px', borderRadius:4}}><b>Error:</b> {h.error_reason}</div>}
                    </div>
                  ))}
                </div>

                {/* Rendered preview */}
                {leadDetails.renderedSubject && (
                  <div style={{background:'#eef2ff', padding:14, borderRadius:10, border:'1px solid #c7d2fe'}}>
                    <div style={{fontWeight:700, fontSize:12, color:'#4338ca'}}>📧 Rendered Email Preview:</div>
                    <div style={{marginTop:8, fontSize:12}}><b>Subject:</b> {leadDetails.renderedSubject}</div>
                    <div style={{marginTop:8, fontSize:12, whiteSpace:'pre-wrap', background:'white', padding:10, borderRadius:8, border:'1px solid #e5e7eb', maxHeight:200, overflowY:'auto'}}>{leadDetails.renderedBody}</div>
                  </div>
                )}

                {/* Bounce reason */}
                {leadDetails.lead.bounce_reason && (
                  <div style={{background:'#fee2e2', padding:12, borderRadius:10, border:'1px solid #fecaca'}}>
                    <div style={{fontWeight:700, fontSize:11, color:'#991b1b'}}>❌ Bounce Reason:</div>
                    <div style={{fontSize:11, marginTop:4, color:'#991b1b'}}>{leadDetails.lead.bounce_reason}</div>
                  </div>
                )}

                {/* Events timeline */}
                <div style={{background:'#f9fafb', padding:14, borderRadius:10, border:'1px solid #e5e7eb'}}>
                  <div style={{fontWeight:700, fontSize:12}}>📜 Events Timeline:</div>
                  {leadDetails.events.length===0 && <div style={{fontSize:11, color:'#9ca3af', marginTop:8}}>No events yet</div>}
                  {leadDetails.events.map(ev=>(
                    <div key={ev.id} style={{display:'flex', gap:10, marginTop:8, fontSize:11, background:'white', padding:'8px 10px', borderRadius:8, border:'1px solid #e5e7eb'}}>
                      <span style={{fontWeight:700, textTransform:'uppercase', color: ev.type==='sent' ? '#065f46' : ev.type==='open' ? '#4338ca' : ev.type==='click' ? '#7c3aed' : ev.type==='bounce' ? '#991b1b' : '#6b7280'}}>{ev.type}</span>
                      <span style={{color:'#6b7280'}}>{new Date(ev.created_at).toLocaleString()}</span>
                      <span style={{flex:1, overflow:'hidden', textOverflow:'ellipsis'}}>{ev.meta?.slice(0,100) || ''}</span>
                    </div>
                  ))}
                </div>

                {/* Clicks */}
                {leadDetails.clicks.length>0 && (
                  <div style={{background:'#f5f3ff', padding:12, borderRadius:10, border:'1px solid #ddd6fe'}}>
                    <div style={{fontWeight:700, fontSize:11}}>🔗 Clicked Links:</div>
                    {leadDetails.clicks.map(c=>(
                      <div key={c.id} style={{fontSize:11, marginTop:6, background:'white', padding:'6px 10px', borderRadius:6}}>
                        <div style={{fontWeight:600, wordBreak:'break-all'}}>{c.original_url}</div>
                        <div style={{fontSize:10, color:'#6b7280'}}>{c.clicked_at ? `Clicked at ${new Date(c.clicked_at).toLocaleString()}` : 'Not clicked yet'}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                  <button onClick={()=>toggleSub(leadDetails.lead)} style={{padding:'8px 14px', borderRadius:8, border:'1px solid #fde68a', background: leadDetails.lead.is_subscribed ? '#fef3c7' : '#dcfce7', fontWeight:600, fontSize:11, cursor:'pointer'}}>
                    {leadDetails.lead.is_subscribed ? '❌ Unsubscribe' : '✅ Subscribe'}
                  </button>
                  <button onClick={()=>{ fetch(apiUrl(`/api/templates/${leadDetails.lead.template_id}/leads/reset`), {method:'POST'}).then(()=>{ alert('Reset to pending'); closeModal(); }) }} style={{padding:'8px 14px', borderRadius:8, border:'1px solid #bfdbfe', background:'#eff6ff', fontWeight:600, fontSize:11, cursor:'pointer'}}>🔄 Reset to Pending</button>
                  <button onClick={closeModal} style={{padding:'8px 14px', borderRadius:8, border:'1px solid #e5e7eb', background:'white', fontWeight:600, fontSize:11, cursor:'pointer'}}>Close</button>
                </div>

                <div style={{fontSize:10, color:'#9ca3af'}}>
                  ID: {leadDetails.lead.id} | Created: {new Date(leadDetails.lead.created_at).toLocaleString()} | Next: {leadDetails.lead.next_send_at ? new Date(leadDetails.lead.next_send_at).toLocaleString() : '-'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}