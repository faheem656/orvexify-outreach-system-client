import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import s from './Dashboard.module.css'
import { apiUrl } from '../config.js'
import { useApp } from '../context/AppContext.jsx'

export default function Dashboard() {
  const { stats } = useApp()
  const nav = useNavigate()
  const [cron, setCron] = useState(null)
  const [replies, setReplies] = useState([])
  const [busy, setBusy] = useState(false)

  const fetchCron = () => fetch(apiUrl('/api/cron/status')).then(r => r.json()).catch(() => null)
  const fetchReplies = () => fetch(apiUrl('/api/replies')).then(r => r.text()).then(t => {
    if (t.trim().startsWith('<')) return
    try { setReplies(JSON.parse(t)) } catch { /* ignore */ }
  }).catch(() => {})
  useEffect(() => {
    fetchCron(); fetchReplies()
    const i = setInterval(() => { fetchCron(); fetchReplies() }, 30000)
    return () => clearInterval(i)
  }, [])

  const runNow = async () => {
    if (!confirm('Run auto-send NOW for all templates? (30 per template)')) return
    setBusy(true)
    const data = await fetch(apiUrl('/api/cron/run-now'), { method: 'POST' }).then(r => r.json())
    alert(`✅ Cron triggered!\nLast run: ${data.lastCronRun}\nSent: ${data.lastCronResult?.totalSent || 0}`)
    setBusy(false); fetchCron()
  }
  const fixWindow = async () => {
    if (!confirm('Fix window to 0-23 (24h open) - Auto-send hamesha ACTIVE rahega?')) return
    const data = await fetch(apiUrl('/api/settings/fix-window'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ start: 0, end: 23 }) }).then(r => r.json())
    alert(`✅ Window ${data.start}-${data.end} | Within: ${data.withinWindow ? 'YES ACTIVE' : 'NO'}`)
    fetchCron()
  }
  const diagnose = async () => {
    setBusy(true)
    const data = await fetch(apiUrl('/api/debug/why-not-sending')).then(r => r.json())
    alert(`${data.summary}\n\n${(data.issues || []).join('\n')}\n\nFixes:\n${(data.fixes || []).join('\n')}`)
    setBusy(false)
  }
  const forceOne = async () => {
    if (!confirm('Send 1 pending lead NOW with full error details?')) return
    setBusy(true)
    const data = await fetch(apiUrl('/api/debug/force-send-one'), { method: 'POST' }).then(r => r.json())
    alert(data.message + '\n\nHint: ' + (data.hint || ''))
    setBusy(false)
    if (data.ok) nav('/emails')
  }

  const sent = stats?.totalSent || 0
  const replyRate = sent ? ((stats.replied / sent) * 100).toFixed(1) : '0.0'
  const openRate = sent ? ((stats.opened / sent) * 100).toFixed(1) : '0.0'
  const clickRate = stats?.opened ? ((stats.clicked / stats.opened) * 100).toFixed(1) : '0.0'
  const bounceRate = sent ? ((stats.bounced / sent) * 100).toFixed(1) : '0.0'

  const funnel = stats?.funnel
  const base = Math.max(sent, 1)

  return (
    <div className={s.wrap}>
      <div className={s.pageHead}>
        <div>
          <div className={s.pageTitle}>📊 Dashboard</div>
          <div className={s.pageSub}>Auto-send har 5 min • per-lead local time 9-5 • full per-email accounting</div>
        </div>
        <div className={s.actions}>
          <button onClick={runNow} disabled={busy} className={s.btnGreen}>🚀 Run Auto-Send NOW</button>
          <button onClick={fixWindow} className={s.btnRed}>🔧 Fix Window 0-23</button>
          <button onClick={diagnose} disabled={busy} className={s.btnOrange}>🔍 Why Not Sending?</button>
          <button onClick={forceOne} disabled={busy} className={s.btnPurple}>🧪 Force Send 1</button>
        </div>
      </div>

      {/* Cron status strip */}
      <div className={`${s.cronStrip} ${cron?.window?.withinWindow ? s.cronOk : s.cronBad}`}>
        <div>
          <b>⏰ Auto-Send: {cron?.window?.withinWindow ? '✅ ACTIVE' : '❌ OUTSIDE WINDOW'}</b>
          <div className={s.cronMeta}>
            Last cron: {cron?.lastCronRun ? new Date(cron.lastCronRun).toLocaleString() : 'Never (will run in 10s)'}
            {' • '}Last: {cron?.lastCronResult ? `${cron.lastCronResult.totalSent} sent` : 'waiting'}
            {' • '}Window {cron?.window?.start || 0}:00-{cron?.window?.end || 23}:00 {cron?.window?.timezone}
            {' • '}Senders: {cron?.senders?.map(x => `${x.smtp_user} ${x.sent_today}/${x.daily_limit}`).join(', ') || '-'}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className={s.cards}>
        <div className={s.statCard}>
          <div className={s.statLabel}>Total Leads (Sub / Unsub)</div>
          <div className={s.statValue}>{stats?.totalLeads || 0}</div>
          <div className={s.statSub}>✅ {stats?.subscribed || 0} sub • ❌ {stats?.unsubscribed || 0} unsub • {stats?.pending || 0} pending</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Sent Today / Capacity</div>
          <div className={s.statValue}>{stats?.totalSentToday || 0} <span className={s.statValueSmall}>/ {stats?.totalCapacity || 0}</span></div>
          <div className={s.statSub}>{stats?.senderCount || 0} senders • {sent} total sent • {stats?.estimatedDays || 0}d left</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Bounce / Open / Click</div>
          <div className={s.miniRates}>
            <span style={{ color: parseFloat(bounceRate) > 2 ? '#ef4444' : '#6b7280' }}>Bounced {stats?.bounced || 0} ({bounceRate}%)</span>
            <span>Opened {stats?.opened || 0} ({openRate}%)</span>
            <span style={{ color: '#6b21a8' }}>Clicked {stats?.clicked || 0} ({clickRate}%) 🔥</span>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Replied — KPI 💬</div>
          <div className={s.statValue} style={{ color: '#065f46' }}>{stats?.replied || 0} <span className={s.statValueSmall}>({replyRate}%)</span></div>
          <div className={s.statSub}>{parseFloat(replyRate) > 3 ? '✅ Good' : '⚠️ Improve'}</div>
        </div>
      </div>

      <div className={s.twoCol}>
        {/* Funnel */}
        <div className={s.card}>
          <div className={s.cardTitle}>📈 Full Funnel — Attempted → Sent → Opened → Clicked → Replied</div>
          {[
            { label: '📬 Attempted', count: funnel?.attempted ?? sent + (funnel?.bounced || 0) + (funnel?.failed || 0), color: '#64748b' },
            { label: '📤 Sent', count: funnel?.sent ?? sent, color: '#4f46e5' },
            { label: '👁 Opened', count: stats?.opened || 0, color: '#0891b2' },
            { label: '🔗 Clicked', count: stats?.clicked || 0, color: '#7c3aed' },
            { label: '💬 Replied', count: stats?.replied || 0, color: '#059669' },
            { label: '❌ Bounced', count: funnel?.bounced ?? (stats?.bounced || 0), color: '#dc2626' },
          ].map(f => (
            <div key={f.label} className={s.funnelRow}>
              <div className={s.funnelLabel}>{f.label}</div>
              <div className={s.funnelBar}><div style={{ width: `${Math.min(100, (f.count / Math.max(base, f.count, 1)) * 100)}%`, background: f.color }} /></div>
              <div className={s.funnelCount} style={{ color: f.color }}>{f.count}</div>
            </div>
          ))}
          <div className={s.funnelNote}>
            💡 Bounce rate {bounceRate}% — 2% se neeche rakhna zaroori hai orvexify.com reputation ke liye. 3+ bounces/hr = sender auto-pause.
            Har email ka poora hisab <b>📋 Email Log</b> page me hai (bounce/reject reason + open/click + sender + template + step).
          </div>
        </div>

        {/* Country breakdown */}
        <div className={s.card}>
          <div className={s.cardTitle}>🌍 Country Breakdown</div>
          {stats?.countryBreakdown?.length ? stats.countryBreakdown.map(cb => (
            <div key={cb.country_code} className={s.countryRow}>
              <span className={s.countryFlag}>{cb.flag}</span>
              <div className={s.countryInfo}>
                <b>{cb.country} ({cb.country_code})</b>
                <div className={s.countryMeta}>{cb.timezone} • total {cb.total} • pending {cb.pending} • sent {cb.sent} • bounced {cb.bounced} • opened {cb.opened}</div>
              </div>
              <button onClick={() => nav('/leads')} className={s.linkBtn}>View →</button>
            </div>
          )) : <div className={s.empty}>No leads yet — <button onClick={() => nav('/leads')} className={s.linkBtn}>Add leads →</button></div>}
        </div>
      </div>

      {/* Replies */}
      <div className={s.card}>
        <div className={s.cardHead}>
          <div className={s.cardTitle}>💬 Replies — Clinics Jo Reply Kiye {replies.length > 0 && <span className={s.repliesPill}>{replies.length}</span>}</div>
          <button onClick={fetchReplies} className={s.btnGhost}>🔄 Refresh</button>
        </div>
        {replies.length === 0 ? (
          <div className={s.empty}>Abhi koi reply nahi. Senders page → Hostinger API key + 1-Click Webhook Setup — jab clinic reply karega yahan dikhega.</div>
        ) : (
          <div className={s.tableScroll}>
            <table className={s.table}>
              <thead><tr><th>From</th><th>Clinic</th><th>Subject</th><th>Preview</th><th>When</th><th>Status</th></tr></thead>
              <tbody>
                {replies.map(r => (
                  <tr key={r.id} style={{ background: r.lead_id ? '#f0fdf4' : 'white' }}>
                    <td className={s.tdSm}>{r.from_email}{r.lead_id && <div className={s.leadYes}>✅ Our lead</div>}</td>
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
    </div>
  )
}
