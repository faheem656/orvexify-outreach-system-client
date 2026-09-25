import React, { useState, useEffect, useRef, useCallback } from 'react'
import s from './Reports.module.css'
import { apiUrl } from '../config.js'
import { useApp } from '../context/AppContext.jsx'

const COUNTRY_OPTS = [
  { code: 'US', flag: '🇺🇸', name: 'USA' },
  { code: 'GB', flag: '🇬🇧', name: 'UK' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: 'IN', flag: '🇮🇳', name: 'India' },
  { code: 'PK', flag: '🇵🇰', name: 'Pakistan' },
]

export default function Reports() {
  const { templates, stats } = useApp()
  const [leads, setLeads] = useState([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [subFilter, setSubFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [cronStatus, setCronStatus] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [leadDetails, setLeadDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState(null)
  const [debugLoading, setDebugLoading] = useState(false)
  const [forceSendResult, setForceSendResult] = useState(null)
  const [replies, setReplies] = useState([])
  const [statusCounts, setStatusCounts] = useState(null)
  const LIMIT = 50
  const observerRef = useRef(null)

  // Live status counts (effective status se) — chips par numbers dikhane ke liye
  const fetchStatusCounts = useCallback(() => {
    fetch(apiUrl('/api/reports/summary?days=30')).then(r => r.text()).then(t => {
      if (t.trim().startsWith('<')) return
      try { setStatusCounts(JSON.parse(t).leadStatusCounts || null) } catch { /* ignore */ }
    }).catch(() => { })
  }, [])
  useEffect(() => { fetchStatusCounts(); const i = setInterval(fetchStatusCounts, 30000); return () => clearInterval(i) }, [fetchStatusCounts])

  const fetchReplies = useCallback(() => {
    fetch(apiUrl('/api/replies')).then(r => r.text()).then(t => {
      if (t.trim().startsWith('<')) return
      try { setReplies(JSON.parse(t)) } catch { /* ignore */ }
    }).catch(() => { })
  }, [])
  useEffect(() => { fetchReplies(); const i = setInterval(fetchReplies, 30000); return () => clearInterval(i) }, [fetchReplies])

  const fetchCronStatus = () => fetch(apiUrl('/api/cron/status')).then(r => r.json()).then(setCronStatus).catch(() => { })
  useEffect(() => { fetchCronStatus(); const i = setInterval(fetchCronStatus, 30000); return () => clearInterval(i) }, [])

  const triggerCronNow = async () => {
    if (!confirm('Run auto-send NOW for all templates? (30 per template)')) return
    const data = await fetch(apiUrl('/api/cron/run-now'), { method: 'POST' }).then(r => r.json())
    alert(`✅ Cron triggered!\nLast run: ${data.lastCronRun}\nSent: ${data.lastCronResult?.totalSent || 0}`)
    fetchCronStatus(); setPage(0); fetchReports(0, false)
  }

  const fixWindow = async () => {
    if (!confirm('Fix window to 0-23 (24h open) - Auto-send hamesha ACTIVE rahega?')) return
    const data = await fetch(apiUrl('/api/settings/fix-window'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ start: 0, end: 23 }) }).then(r => r.json())
    alert(`✅ Window ${data.start}-${data.end} | Within: ${data.withinWindow ? 'YES ACTIVE' : 'NO'}\n\n.env file bhi update ho gaya — restart ki zarurat nahi! Ab auto-send har 5 min me chalega.`)
    fetchCronStatus()
  }

  const diagnoseWhyNotSending = async () => {
    setDebugLoading(true)
    const data = await fetch(apiUrl('/api/debug/why-not-sending')).then(r => r.json()).catch(() => null)
    if (data) setDebugInfo(data)
    setDebugLoading(false)
  }

  const forceSendOne = async () => {
    if (!confirm('Send 1 pending lead NOW with full error details?')) return
    setDebugLoading(true)
    const data = await fetch(apiUrl('/api/debug/force-send-one'), { method: 'POST' }).then(r => r.json()).catch(e => ({ ok: false, error: e.message }))
    setForceSendResult(data)
    setDebugInfo(null)
    if (data.ok) {
      alert(`✅ SUCCESS: Sent to ${data.lead?.email} via ${data.senderUsed}\nStatus now: ${data.lead?.status}\nSender: ${data.lead?.sender_email}`)
      fetchCronStatus(); setPage(0); fetchReports(0, false)
    } else {
      alert(`❌ FAILED: ${data.error || data.result?.reason}\n\nHint: ${data.hint || data.message}`)
      setDebugInfo({ issues: [data.error], fixes: [data.hint], checks: data })
    }
    setDebugLoading(false)
  }

  const fetchReports = useCallback(async (pageNum = 0, append = false) => {
    if (loading) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      if (subFilter === 'sub') params.set('subscribed', 'true')
      if (subFilter === 'unsub') params.set('subscribed', 'false')
      if (countryFilter !== 'all') params.set('country', countryFilter)
      if (search) params.set('search', search)
      if (selectedTemplate !== 'all') params.set('template_id', selectedTemplate)
      params.set('limit', LIMIT)
      params.set('offset', pageNum * LIMIT)
      const res = await fetch(apiUrl(`/api/reports?${params.toString()}`))
      const text = await res.text()
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) { setLoading(false); return }
      const data = JSON.parse(text)
      if (Array.isArray(data)) { setLeads(data); setTotal(data.length); setHasMore(false) }
      else {
        setTotal(data.total || 0); setHasMore(data.hasMore || false)
        if (append) setLeads(prev => [...prev, ...(data.leads || [])])
        else setLeads(data.leads || [])
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [filter, subFilter, search, selectedTemplate, countryFilter, loading])

  useEffect(() => { setPage(0); fetchReports(0, false) }, [filter, subFilter, selectedTemplate, countryFilter])
  useEffect(() => { if (search) { const t = setTimeout(() => { setPage(0); fetchReports(0, false) }, 400); return () => clearTimeout(t) } }, [search, fetchReports])

  const lastRef = useCallback(node => {
    if (loading) return
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) { const next = page + 1; setPage(next); fetchReports(next, true) }
    })
    if (node) observerRef.current.observe(node)
  }, [loading, hasMore, page, fetchReports])

  const toggleSub = async (lead) => {
    const isSub = lead.is_subscribed !== 0 && lead.status !== 'unsubscribed'
    const action = isSub ? 'unsubscribe' : 'subscribe'
    if (!confirm(isSub ? `Unsub ${lead.email}?` : `Resub ${lead.email}?`)) return
    await fetch(apiUrl(`/api/leads/${lead.id}/${action}`), { method: 'POST' })
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, is_subscribed: isSub ? 0 : 1, status: isSub ? 'unsubscribed' : 'pending' } : l))
    if (selectedLead && selectedLead.id === lead.id) setSelectedLead(prev => ({ ...prev, is_subscribed: isSub ? 0 : 1, status: isSub ? 'unsubscribed' : 'pending' }))
  }

  const openLeadDetails = async (lead) => {
    setSelectedLead(lead); setDetailsLoading(true); setLeadDetails(null)
    try {
      const data = await fetch(apiUrl(`/api/leads/${lead.id}/details`)).then(r => r.json())
      setLeadDetails(data)
    } catch (e) { console.error(e) }
    setDetailsLoading(false)
  }
  const closeModal = () => { setSelectedLead(null); setLeadDetails(null) }

  const sent = stats?.totalSent || 0
  const replyRate = sent ? ((stats.replied / sent) * 100).toFixed(1) : '0.0'
  const bounceRate = sent ? ((stats.bounced / sent) * 100).toFixed(1) : '0.0'
  const openRate = sent ? ((stats.opened / sent) * 100).toFixed(1) : '0.0'
  const clickRate = sent ? ((stats.clicked / sent) * 100).toFixed(1) : '0.0'
  const funnel = stats?.funnel

  return (
    <div className={s.wrap}>
      {/* Auto-send status */}
      <div className={cronStatus?.window?.withinWindow ? s.autoCardOn : s.autoCardOff}>
        <div className={s.autoHead}>
          <div>
            <div className={s.autoTitle}>⏰ Auto-Send Status — {cronStatus?.window?.withinWindow ? '✅ ACTIVE' : '❌ OUTSIDE WINDOW'}</div>
            <div className={s.autoMeta}>
              Last Cron: {cronStatus?.lastCronRun ? new Date(cronStatus.lastCronRun).toLocaleString() : 'Never - will run in 10s'}<br />
              Last Result: {cronStatus?.lastCronResult ? `${cronStatus.lastCronResult.totalSent} sent` : 'Waiting...'} | Pending: {cronStatus?.stats?.pending || 0}<br />
              Window: {cronStatus?.window?.start || 0}:00-{cronStatus?.window?.end || 23}:00 {cronStatus?.window?.timezone} | Within: {cronStatus?.window?.withinWindow ? 'YES' : 'NO'}<br />
              Senders: {cronStatus?.senders?.map(x => `${x.smtp_user} ${x.sent_today}/${x.daily_limit}`).join(', ') || '-'}
            </div>
          </div>
          <div className={s.autoBtns}>
            <button onClick={fixWindow} className={s.autoBtnRed}>🔧 Fix Window to 0-23</button>
            <button onClick={triggerCronNow} className={s.autoBtnGreen}>🚀 Run Auto-Send NOW (30)</button>
            <button onClick={forceSendOne} disabled={debugLoading} className={s.autoBtnPurple}>{debugLoading ? '⏳ Testing...' : '🧪 Force Send 1 Lead Test'}</button>
            <button onClick={diagnoseWhyNotSending} disabled={debugLoading} className={s.autoBtnOrange}>{debugLoading ? '⏳ Diagnosing...' : '🔍 Why Not Sending? Diagnose'}</button>
            <button onClick={fetchCronStatus} className={s.autoBtnWhite}>🔄 Refresh Status</button>
          </div>
        </div>

        {debugInfo && (
          <div className={debugInfo.ok ? s.diagOk : s.diagBad}>
            <div className={s.diagSummary}>{debugInfo.summary}</div>
            {debugInfo.issues?.length > 0 && (
              <div className={s.diagBlock}>
                <div className={s.diagIssuesTitle}>❌ Issues Found:</div>
                {debugInfo.issues.map((iss, i) => <div key={i} className={s.diagIssue}>{iss}</div>)}
              </div>
            )}
            {debugInfo.fixes?.length > 0 && (
              <div className={s.diagBlock}>
                <div className={s.diagFixesTitle}>✅ Fixes:</div>
                {debugInfo.fixes.map((fix, i) => <div key={i} className={s.diagFix}>{fix}</div>)}
              </div>
            )}
            {debugInfo.checks && (
              <details className={s.diagDetails}>
                <summary className={s.diagSummaryBtn}>📋 Full Checks (click to expand)</summary>
                <pre className={s.diagPre}>{JSON.stringify(debugInfo.checks, null, 2)}</pre>
              </details>
            )}
            <button onClick={() => setDebugInfo(null)} className={s.closeSm}>✕ Close Diagnose</button>
          </div>
        )}

        {forceSendResult && (
          <div className={forceSendResult.ok ? s.diagOk : s.diagBad}>
            <div className={s.forceMsg}>{forceSendResult.message}</div>
            <div className={s.forceBox}>
              <div><b>Lead:</b> {forceSendResult.lead?.email} — Status: {forceSendResult.lead?.status} — Sender: {forceSendResult.lead?.sender_email || forceSendResult.senderUsed}</div>
              <div><b>Result:</b> {JSON.stringify(forceSendResult.result)}</div>
              <div className={forceSendResult.ok ? s.forceOk : s.forceErr}><b>Hint:</b> {forceSendResult.hint}</div>
            </div>
            <button onClick={() => setForceSendResult(null)} className={s.closeSm}>✕ Close</button>
          </div>
        )}

        <div className={s.checklist}>
          <b>Deploy ke baad bhi send na ho to checklist (1 by 1):</b><br />
          1. <b>Server running?</b> CMD me `node index.js` chal raha ho? Close mat karo — warna cron stop. PM2 use karo ya CMD open rakho<br />
          2. <b>Diagnose dabao:</b> 🔍 Why Not Sending? button — pura reason batayega (window, limits, pending, etc)<br />
          3. <b>Force Send 1 Test:</b> 🧪 dabao — 1 lead try karega aur pura error dikhayega (535 auth fail? hourly limit? etc)<br />
          4. <b>Window:</b> .env me SEND_START_HOUR=0 SEND_END_HOUR=23 hona chahiye — warna outside_window<br />
          5. <b>Pending?</b> Stats me pending 0 to CSV upload karo Leads page me<br />
          6. <b>Sender limit?</b> Senders page me sent_today/daily_limit — agar 30/30 to limit badhao ya kal wait<br />
          7. <b>Hourly limit?</b> 8/hour default — Diagnose me dikhega agar hit hua to<br />
          8. <b>SMTP Test?</b> Senders page Test SMTP — agar Invalid login to password galat<br />
          9. <b>Logs dekho:</b> Server CMD me DEBUG logs har 5 min me<br />
          10. <b>Email Log:</b> 📋 Email Log page me har email ka bounce/reject/open/click ka poora hisab
        </div>
      </div>

      <div className={s.cards}>
        <div className={s.statCard}><div className={s.statLabel}>Total Leads / Sub / Unsub</div><div className={s.statValue}>{stats?.totalLeads || 0}</div><div className={s.statSub}>✅ {stats?.subscribed || 0} sub • ❌ {stats?.unsubscribed || 0} unsub</div></div>
        <div className={s.statCard}><div className={s.statLabel}>Sent Today / Capacity</div><div className={s.statValue}>{stats?.totalSentToday || 0} / {stats?.totalCapacity || 0}</div><div className={s.statSub}>{stats?.senderCount || 0} senders • {sent} total sent • {stats?.pending || 0} pending</div></div>
        <div className={s.statCard}><div className={s.statLabel}>Bounce / Open / Click</div>
          <div className={s.miniRates}>
            <span style={{ color: parseFloat(bounceRate) > 2 ? '#ef4444' : '#6b7280' }}>Bounced {stats?.bounced || 0} ({bounceRate}%)</span>
            <span>Opened {stats?.opened || 0} ({openRate}%)</span>
            <span style={{ color: '#6b21a8' }}>Clicked {stats?.clicked || 0} ({clickRate}%) 🔥</span>
          </div>
        </div>
        <div className={s.statCard}><div className={s.statLabel}>Replied — KPI</div><div className={s.statValue} style={{ color: '#065f46' }}>{stats?.replied || 0} <span className={s.statValueSmall}>({replyRate}%)</span></div><div className={s.statSub}>{parseFloat(replyRate) > 3 ? '✅ Good' : '⚠️ Improve'}</div></div>
      </div>

      {/* FULL FUNNEL */}
      <div className={s.card}>
        <div className={s.cardHead}>
          <div className={s.cardTitle}>📈 Full Funnel — Sent → Opened → Clicked → Replied</div>
          <span className={s.funnelTag}>Delivered = provider accept (SMTP 250 / API 204)</span>
        </div>
        <div className={s.funnelCol}>
          {[
            { label: '📤 Sent', count: funnel?.sent ?? sent, color: '#4f46e5' },
            { label: '👁 Opened', count: stats?.opened || 0, color: '#0891b2' },
            { label: '🔗 Clicked', count: stats?.clicked || 0, color: '#7c3aed' },
            { label: '💬 Replied', count: stats?.replied || 0, color: '#059669' },
            { label: '❌ Bounced', count: funnel?.bounced ?? (stats?.bounced || 0), color: '#dc2626' },
            { label: '⚠️ Failed', count: funnel?.failed ?? 0, color: '#d97706' },
          ].map(f => {
            const base = Math.max(funnel?.sent ?? sent, 1)
            const pct = Math.min(100, (f.count / base) * 100)
            const rate = (funnel?.sent ?? sent) ? ((f.count / base) * 100).toFixed(1) : '0.0'
            return (
              <div key={f.label} className={s.funnelRow}>
                <div className={s.funnelLabel}>{f.label}</div>
                <div className={s.funnelBar}><div style={{ width: `${pct}%`, background: f.color }} /></div>
                <div className={s.funnelCount} style={{ color: f.color }}>{f.count} <span className={s.funnelRate}>({rate}%)</span></div>
              </div>
            )
          })}
        </div>
        <div className={s.funnelNote}>
          💡 <b>Replies</b> Hostinger webhook se auto-track hote hain (Senders page me API key + Webhook Setup karo). <b>Bounce rate {bounceRate}%</b> — 2% se neeche rakhna zaroori hai orvexify.com reputation ke liye. 3+ bounces/hr = sender auto-pause.
          Har email ka detail (kon si bounce, kon si reject, open/click) <b>📋 Email Log</b> page me.
        </div>
      </div>

      {/* REPLIES */}
      <div className={s.card}>
        <div className={s.cardHead}>
          <div>
            <div className={s.cardTitle}>💬 Replies — Clinics Jo Reply Kiye {replies.length > 0 && <span className={s.repliesPill}>{replies.length}</span>}</div>
            <div className={s.cardSub}>Hostinger webhook se real-time aate hain. Ye log interest dikhate hain — sab se pehle inko contact karo! 30 sec me auto-refresh.</div>
          </div>
          <button onClick={fetchReplies} className={s.btnGhost}>🔄 Refresh</button>
        </div>
        {replies.length === 0 ? (
          <div className={s.empty}>Abhi koi reply nahi mila.<br /><span style={{ fontSize: 11 }}>Senders page me <b>Hostinger Mail API</b> card → API key paste karo → Save → "1-Click Webhook Setup" dabao. Jab koi clinic reply karega to yahan automatically dikhega + lead status `replied` ho jayega.</span></div>
        ) : (
          <div className={s.tableScroll}>
            <table className={s.table}>
              <thead><tr><th>Reply From</th><th>Clinic / Lead</th><th>Subject</th><th>Preview</th><th>When</th><th>Lead Status</th></tr></thead>
              <tbody>
                {replies.map(r => (
                  <tr key={r.id} style={{ background: r.lead_id ? '#f0fdf4' : 'white' }}>
                    <td className={s.tdName}>{r.from_email}{r.lead_id && <div className={s.leadYes}>✅ Our lead</div>}</td>
                    <td className={s.tdSm}>{(r.clinic_name || `${r.first_name || ''} ${r.last_name || ''}`.trim()) || '-'}<br /><span className={s.tdXs}>{r.lead_email || ''}</span></td>
                    <td className={s.tdSm} style={{ fontWeight: 700, maxWidth: 180 }}>{r.subject || '(no subject)'}</td>
                    <td className={s.tdEllipsis}>{r.snippet || '-'}</td>
                    <td className={s.tdXs} style={{ whiteSpace: 'nowrap' }}>{new Date(r.received_at).toLocaleString()}</td>
                    <td><span className={`${s.badge} ${r.lead_status === 'replied' ? s.badgeReplied : s.badgePending}`}>{r.lead_status || 'external'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LEADS TABLE */}
      <div className={s.card}>
        <div className={s.cardHead}>
          <div>
            <div className={s.cardTitle}>📊 Reports — Country 🌍 + Timezone + Sender + Modal</div>
            <div className={s.cardSub}>Country flag + local time + timezone filter — dekho kaunsi lead kis mulk ki hai + uske local time pe send hoga. Click row for modal. Total {total} loaded {leads.length}</div>
          </div>
          <div className={s.controls}>
            <select className={s.select} value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} style={{ width: 140 }}>
              <option value="all">All Templates</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className={s.select} value={countryFilter} onChange={e => setCountryFilter(e.target.value)} style={{ width: 120 }}>
              <option value="all">All Countries</option>
              {COUNTRY_OPTS.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
            </select>
            <select className={s.select} value={subFilter} onChange={e => setSubFilter(e.target.value)} style={{ width: 100 }}>
              <option value="all">All Sub</option><option value="sub">✅ Sub</option><option value="unsub">❌ Unsub</option>
            </select>
            <input className={s.input} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 120 }} />
            <button onClick={() => { setPage(0); fetchReports(0, false) }} className={s.btnGhost}>🔄 Refresh</button>
          </div>
        </div>

        <div className={s.statusTabs}>
          {['all', 'pending', 'sent', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed'].map(st => {
            const cnt = st === 'all' ? statusCounts?.total : statusCounts ? statusCounts[st] : null
            return (
              <button key={st} onClick={() => setFilter(st)} className={filter === st ? s.tabActive : s.tab}>
                {st}{cnt != null && <span className={s.tabCount}>{cnt}</span>}
              </button>
            )
          })}
        </div>

        <div className={s.hintBox}>
          💡 <b>Yahan kya kya hai (confusion na ho):</b> Yeh table <b>lead-level</b> hisab hai — har lead ka <b>latest stage</b>.
          &nbsp;•&nbsp;<b>sent</b> = email gaya, abhi open nahi hua &nbsp;•&nbsp;<b>opened</b> = email open hui, click nahi &nbsp;•&nbsp;<b>clicked</b> = link click kiya &nbsp;•&nbsp;<b>pending</b> = abhi send nahi hui.
          <br />
          ⚠️ <b>📋 Email Log</b> alag cheez hai — wo <b>har email attempt</b> ka hisab hai (follow-up emails alag count hoti hain, is liye wahan emails 243 dikhengi, yahan leads kam).
          Dashboard ka <b>funnel</b> = engagement % (opened/clicked leads). <b>Teeno reports sahi hain — bas level alag hai.</b> Bounce 0 = sach me 0 bounces, 100% delivery ✅.
        </div>

        <div className={s.tableOuter} onScroll={e => {
          const { scrollTop, scrollHeight, clientHeight } = e.target
          if (scrollHeight - scrollTop <= clientHeight + 150 && hasMore && !loading) { const next = page + 1; setPage(next); fetchReports(next, true) }
        }}>
          <div className={s.tableScroll}>
            <table className={s.table}>
              <thead className={s.thead}><tr><th>Email</th><th>Name</th><th>🌍 Country</th><th>Company</th><th>Template</th><th>Status</th><th>Sub</th><th>Local Time</th><th>Opens</th><th>Clicks</th><th>Sender</th></tr></thead>
              <tbody>
                {leads.map((l, idx) => {
                  const isSub = l.is_subscribed !== 0 && l.status !== 'unsubscribed'
                  // Effective status: server se aaye ho to wo, warna counters se client-side
                  const st = l.eff_status || (l.is_subscribed === 0 || l.status === 'unsubscribed' ? 'unsubscribed' : l.status === 'bounced' || l.status === 'replied' ? l.status : l.click_count > 0 ? 'clicked' : l.open_count > 0 ? 'opened' : l.status)
                  return (
                    <tr key={l.id} ref={idx === leads.length - 1 ? lastRef : null} className={!isSub ? s.rowUnsub : ''} style={{ cursor: 'pointer' }} onClick={() => openLeadDetails(l)}>
                      <td className={s.tdName}>{l.email}</td>
                      <td className={s.tdSm}>{l.first_name} {l.last_name}</td>
                      <td className={s.tdCountry}>{l.flag || '🇺🇸'} {l.country || 'USA'} ({l.country_code || 'US'})<br /><span className={s.tdXs}>{l.timezone || 'America/New_York'}</span></td>
                      <td className={s.tdEllipsis} style={{ fontWeight: 600 }}>{(() => { try { return l.clinic_name || JSON.parse(l.custom_json || '{}').company_name || '-' } catch { return l.clinic_name || '-' } })()}</td>
                      <td className={s.tdXs}>{l.template_name || '-'}</td>
                      <td><span className={`${s.badge} ${st === 'pending' ? s.badgePending : st === 'sent' ? s.badgeSent : st === 'opened' ? s.badgeOpened : st === 'clicked' ? s.badgeClicked : st === 'replied' ? s.badgeReplied : st === 'bounced' ? s.badgeBounced : s.badgeUnsub}`}>{st}</span></td>
                      <td><span className={isSub ? s.subPillOn : s.subPillOff}>{isSub ? '✅ Sub' : '❌ Unsub'}</span></td>
                      <td className={s.tdXs} style={{ color: l.withinWindow ? '#065f46' : '#991b1b', fontWeight: 600 }}>{l.localTime || '-'}<br /><span style={{ fontSize: 8 }}>{l.withinWindow ? '✅ Within 9-5' : '❌ Outside 9-5'}</span></td>
                      <td style={{ color: l.open_count > 0 ? '#4338ca' : '#9ca3af', fontSize: 11, fontWeight: l.open_count > 0 ? 700 : 400 }}>{l.open_count}</td>
                      <td style={{ color: l.click_count > 0 ? '#6b21a8' : '#9ca3af', fontSize: 11, fontWeight: l.click_count > 0 ? 800 : 400 }}>{l.click_count}</td>
                      <td className={s.tdXs} style={{ fontWeight: 600, color: l.sender_email ? '#065f46' : '#9ca3af' }}>{l.sender_email || (l.assigned_sender_id ? `${l.assigned_sender_id.slice(0, 8)}...` : 'Pending')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {loading && <div className={s.loadNote}>⏳ Loading {LIMIT} more...</div>}
            {!loading && hasMore && <div className={s.loadNote} style={{ color: '#9ca3af' }}>Scroll down for more — {total - leads.length} remaining</div>}
            {!loading && !hasMore && leads.length > 0 && <div className={s.loadNote} style={{ color: '#059669' }}>✅ All {total} loaded — click row for detail modal</div>}
            {leads.length === 0 && !loading && <div className={s.empty}>No data. Add leads in Leads page</div>}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLead && (
        <div className={s.modalOverlay} onClick={closeModal}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <div className={s.modalTitle}>📧 Lead Detail — {selectedLead.email}</div>
              <button onClick={closeModal} className={s.modalClose}>✕ Close</button>
            </div>

            {detailsLoading && <div className={s.empty}>⏳ Loading details...</div>}

            {leadDetails && (
              <div className={s.modalBody}>
                <div className={s.detailGrid}>
                  <div className={s.detailTile}><div className={s.detailLabel}>EMAIL</div><div className={s.detailValue}>{leadDetails.lead.email}</div></div>
                  <div className={s.detailTile}><div className={s.detailLabel}>NAME</div><div className={s.detailValueSm}>{leadDetails.lead.first_name} {leadDetails.lead.last_name} {leadDetails.custom.Title ? `(${leadDetails.custom.Title})` : ''}</div></div>
                  <div className={s.detailTile}><div className={s.detailLabel}>COMPANY</div><div className={s.detailValue}>{leadDetails.lead.clinic_name || leadDetails.custom['Company Name'] || '-'}</div></div>
                  <div className={s.detailTile} style={{ background: leadDetails.lead.status === 'sent' ? '#dcfce7' : leadDetails.lead.status === 'pending' ? '#fef3c7' : leadDetails.lead.status === 'bounced' ? '#fee2e2' : '#eef2ff' }}>
                    <div className={s.detailLabel}>STATUS</div>
                    <div className={s.detailValue} style={{ fontSize: 14 }}>{leadDetails.lead.status}</div>
                    <div className={s.detailLabel}>Step {leadDetails.lead.current_step}/4</div>
                  </div>
                </div>

                <div className={leadDetails.lead.sender_email ? s.senderBoxOk : s.senderBoxWarn}>
                  <div className={s.senderBoxTitle}>📤 Sender — Kis mail se send hui?</div>
                  {leadDetails.lead.sender_email ? (
                    <div className={s.senderBoxMeta}>
                      <div><b>From:</b> {leadDetails.lead.sender_from_name} &lt;{leadDetails.lead.sender_email}&gt;</div>
                      <div><b>Host:</b> {leadDetails.lead.smtp_host}:{leadDetails.lead.smtp_port}</div>
                      <div><b>Assigned ID:</b> {leadDetails.lead.assigned_sender_id}</div>
                      <div className={s.senderBoxOkText}>✅ Ye lead is sender se send hui hai</div>
                    </div>
                  ) : (
                    <div className={s.senderBoxMeta}>
                      ⏳ Abhi tak send nahi hui — status pending hai. Reason: {leadDetails.lead.status === 'pending' ? 'Queue me hai, auto-send har 5 min me bhejega ya Send Now dabao' : leadDetails.lead.bounce_reason || 'Unknown'}
                      <br /><br />
                      <b>Possible reasons pending:</b><br />
                      — Outside window (9-16 NY) — fix 0-23<br />— Daily limit hit<br />— Hourly limit hit<br />— SMTP fail
                    </div>
                  )}
                </div>

                <div className={s.statRow}>
                  <div className={s.statTile}><div className={s.statTileValue} style={{ color: leadDetails.lead.open_count > 0 ? '#4f46e5' : '#9ca3af' }}>{leadDetails.lead.open_count}</div><div className={s.detailLabel}>OPENS</div></div>
                  <div className={s.statTile}><div className={s.statTileValue} style={{ color: leadDetails.lead.click_count > 0 ? '#7c3aed' : '#9ca3af' }}>{leadDetails.lead.click_count}</div><div className={s.detailLabel}>CLICKS</div></div>
                  <div className={s.statTile}><div className={s.statTileValueSm}>{leadDetails.lead.eff_status || (leadDetails.lead.is_subscribed === 0 || leadDetails.lead.status === 'unsubscribed' ? 'unsubscribed' : leadDetails.lead.status === 'bounced' || leadDetails.lead.status === 'replied' ? leadDetails.lead.status : leadDetails.lead.click_count > 0 ? 'clicked' : leadDetails.lead.open_count > 0 ? 'opened' : leadDetails.lead.status)}</div><div className={s.detailLabel}>STATUS</div></div>
                  <div className={s.statTile}><div className={s.statTileValueSm}>{leadDetails.lead.is_subscribed ? '✅ Sub' : '❌ Unsub'}</div><div className={s.detailLabel}>SUB</div></div>
                </div>

                {/* Send history for this lead (full per-email accounting) */}
                {leadDetails.history?.length > 0 && (
                  <div className={s.historyBox}>
                    <div className={s.historyTitle}>📋 Send History — har email ka hisab (sent/bounce/reject/fail):</div>
                    {leadDetails.history.map(h => (
                      <div key={h.id} className={s.historyRow}>
                        <span className={s.historyTime}>{new Date(h.sent_at).toLocaleString()}</span>
                        <span className={`${s.badge} ${h.status === 'sent' ? s.badgeSent : h.status === 'bounced' ? s.badgeBounced : s.badgeFailed}`}>{h.status}{h.status_detail ? `: ${h.status_detail}` : ''}</span>
                        <span className={s.historySender}>{h.sender_email} • step {h.step} • {h.via}</span>
                        {h.error_reason && <div className={s.historyError}>❌ {h.error_reason}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {leadDetails.renderedSubject && (
                  <div className={s.renderedBox}>
                    <div className={s.renderedTitle}>📧 Rendered Email Preview (Jo bheja gaya / jayega):</div>
                    <div className={s.renderedSubject}><b>Subject:</b> {leadDetails.renderedSubject}</div>
                    <div className={s.renderedBody}>{leadDetails.renderedBody}</div>
                  </div>
                )}

                {leadDetails.lead.bounce_reason && (
                  <div className={s.bounceBox}>
                    <div className={s.bounceTitle}>❌ Bounce Reason:</div>
                    <div className={s.bounceText}>{leadDetails.lead.bounce_reason}</div>
                  </div>
                )}

                <div className={s.eventsBox}>
                  <div className={s.eventsTitle}>📜 Events Timeline — Full History:</div>
                  {leadDetails.events.length === 0 && <div className={s.eventsEmpty}>No events yet — pending queue me hai</div>}
                  {leadDetails.events.map(ev => (
                    <div key={ev.id} className={s.eventRow}>
                      <span className={s.eventType} style={{ color: ev.type === 'sent' ? '#065f46' : ev.type === 'open' ? '#4338ca' : ev.type === 'click' ? '#7c3aed' : ev.type === 'bounce' ? '#991b1b' : '#6b7280' }}>{ev.type}</span>
                      <span className={s.eventTime}>{new Date(ev.created_at).toLocaleString()}</span>
                      <span className={s.eventMeta}>{ev.meta?.slice(0, 100) || ''}</span>
                    </div>
                  ))}
                </div>

                {leadDetails.clicks.length > 0 && (
                  <div className={s.clicksBox}>
                    <div className={s.clicksTitle}>🔗 Clicked Links:</div>
                    {leadDetails.clicks.map(c => (
                      <div key={c.id} className={s.clickRow}>
                        <div className={s.clickUrl}>{c.original_url}</div>
                        <div className={s.tdXs}>{c.clicked_at ? `Clicked at ${new Date(c.clicked_at).toLocaleString()}` : 'Not clicked yet'}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className={s.modalActions}>
                  <button onClick={() => toggleSub(leadDetails.lead)} className={leadDetails.lead.is_subscribed ? s.actionYellow : s.actionGreen}>{leadDetails.lead.is_subscribed ? '❌ Unsubscribe' : '✅ Subscribe'}</button>
                  <button onClick={() => { fetch(apiUrl(`/api/templates/${leadDetails.lead.template_id}/leads/reset`), { method: 'POST' }).then(() => { alert('Reset to pending'); closeModal() }) }} className={s.actionBlue}>🔄 Reset to Pending</button>
                  <button onClick={closeModal} className={s.actionWhite}>Close</button>
                </div>

                <div className={s.modalFoot}>
                  ID: {leadDetails.lead.id} | Token: {leadDetails.lead.unsubscribe_token?.slice(0, 8)}... | Created: {new Date(leadDetails.lead.created_at).toLocaleString()} | Next: {leadDetails.lead.next_send_at ? new Date(leadDetails.lead.next_send_at).toLocaleString() : '-'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
