import React, { useState, useEffect, useCallback } from 'react'
import s from './EmailLog.module.css'
import { apiUrl } from '../config.js'
import { useApp } from '../context/AppContext.jsx'

const DETAIL_LABELS = {
  hard_bounce: ['Hard Bounce', 'badgeHard'],
  soft_bounce: ['Soft Bounce', 'badgeSoft'],
  rejected: ['Rejected', 'badgeRejected'],
  auth_failed: ['Auth Failed', 'badgeRejected'],
  ssl_error: ['SSL Error', 'badgeFailed'],
  rate_limited: ['Rate Limited', 'badgeFailed'],
  api_error: ['API Error', 'badgeFailed'],
  unknown: ['Unknown', 'badgeMuted'],
}
const labelFor = (key) => DETAIL_LABELS[key]?.[0] || key || ''
const clsFor = (key) => DETAIL_LABELS[key]?.[1] || 'badgeMuted'

const LIMIT = 50

export default function EmailLog() {
  const { templates } = useApp()
  const [emails, setEmails] = useState([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [summary, setSummary] = useState(null)
  const [days, setDays] = useState(7)
  const [sel, setSel] = useState(null)
  const [selDetails, setSelDetails] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [f, setF] = useState({ status: 'all', detail: 'all', sender: '', template_id: 'all', step: 'all', via: 'all', country: '', search: '', from: '', to: '' })

  const fetchPage = useCallback(async (pageNum = 0, append = false) => {
    if (loading) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (f.status !== 'all') params.set('status', f.status)
      if (f.detail !== 'all') params.set('status_detail', f.detail)
      if (f.sender) params.set('sender_email', f.sender)
      if (f.template_id !== 'all') params.set('template_id', f.template_id)
      if (f.step !== 'all') params.set('step', f.step)
      if (f.via !== 'all') params.set('via', f.via)
      if (f.country) params.set('country', f.country)
      if (f.search) params.set('search', f.search)
      if (f.from) params.set('from', f.from)
      if (f.to) params.set('to', f.to)
      params.set('limit', LIMIT)
      params.set('offset', pageNum * LIMIT)
      const data = await fetch(apiUrl(`/api/emails?${params.toString()}`)).then(r => r.json())
      setTotal(data.total || 0)
      setHasMore(data.hasMore || false)
      if (append) setEmails(prev => [...prev, ...(data.emails || [])])
      else setEmails(data.emails || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [f, loading])

  const fetchSummary = useCallback(() => {
    fetch(apiUrl(`/api/emails/summary?days=${days}`)).then(r => r.json()).then(setSummary).catch(() => { })
  }, [days])

  useEffect(() => { setPage(0); fetchPage(0, false) }, [f.status, f.detail, f.sender, f.template_id, f.step, f.via, f.country, f.from, f.to])
  useEffect(() => { if (f.search) { const t = setTimeout(() => { setPage(0); fetchPage(0, false) }, 400); return () => clearTimeout(t) } }, [f.search])
  useEffect(() => { fetchSummary() }, [fetchSummary])

  const openDetail = async (email) => {
    setSel(email); setDetailLoading(true); setSelDetails(null)
    try {
      const data = await fetch(apiUrl(`/api/emails/${email.id}`)).then(r => r.json())
      setSelDetails(data)
    } catch (e) { console.error(e) }
    setDetailLoading(false)
  }

  const t = summary?.totals || {}
  const attempted = (t.sent || 0) + (t.bounced || 0) + (t.failed || 0)

  return (
    <div className={s.wrap}>
      <div className={s.pageHead}>
        <div>
          <div className={s.pageTitle}>📋 Email Log — Har Email Ka Poora Hisab</div>
          <div className={s.pageSub}>Konsi bounces hui, konsi reject hui, konsi open/click hui — har attempt with reason, sender, template, step, country + via (SMTP/API)</div>
        </div>
        <div className={s.daysRow}>
          <span className={s.miniNote}>Last:</span>
          {[7, 14, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} className={days === d ? s.dayBtnOn : s.dayBtn}>{d}d</button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className={s.cards}>
        <div className={s.card}>
          <div className={s.cardTitle}>📊 Last {days} Days</div>
          <div className={s.bigRow}>
            <div className={s.bigItem}><div className={s.bigValue}>{attempted}</div><div className={s.bigLabel}>Total Attempts</div></div>
            <div className={s.bigItem}><div className={s.bigValue} style={{ color: '#059669' }}>{t.sent || 0}</div><div className={s.bigLabel}>Sent ✅</div></div>
            <div className={s.bigItem}><div className={s.bigValue} style={{ color: '#dc2626' }}>{t.bounced || 0}</div><div className={s.bigLabel}>Bounced ❌</div></div>
            <div className={s.bigItem}><div className={s.bigValue} style={{ color: '#d97706' }}>{t.failed || 0}</div><div className={s.bigLabel}>Failed ⚠️</div></div>
          </div>
          {attempted > 0 && (
            <div className={s.rateNote}>
              Delivery rate: <b>{Math.round(((t.sent || 0) / attempted) * 100)}%</b>
              {' • '}Bounce rate: <b style={{ color: ((t.bounced || 0) / attempted) > 0.02 ? '#dc2626' : '#059669' }}>{(((t.bounced || 0) / attempted) * 100).toFixed(1)}%</b>
              {' • '}Today: {(summary?.today || []).map(x => `${x.status} ${x.c}`).join(', ') || '—'}
            </div>
          )}
        </div>

        <div className={s.card}>
          <div className={s.cardTitle}>❌ Bounce / Reject Breakdown (all time)</div>
          {(summary?.byDetail || []).length === 0 && <div className={s.emptySm}>Koi bounce/reject nahi — sab clean ✅</div>}
          {(summary?.byDetail || []).map(d => (
            <div key={d.status_detail} className={s.breakRow} onClick={() => setF(prev => ({ ...prev, detail: prev.detail === d.status_detail ? 'all' : d.status_detail }))}>
              <span className={`${s.badge} ${s[clsFor(d.status_detail)]}`}>{labelFor(d.status_detail)}</span>
              <span className={s.breakCount}>{d.c}</span>
              {f.detail === d.status_detail && <span className={s.filterTag}>FILTERED ✕</span>}
            </div>
          ))}
        </div>

        <div className={s.card}>
          <div className={s.cardTitle}>🔝 Top Error Reasons (last {days}d)</div>
          {(summary?.topErrors || []).length === 0 && <div className={s.emptySm}>Koi error reason nahi ✅</div>}
          {(summary?.topErrors || []).slice(0, 6).map((e, i) => (
            <div key={i} className={s.errRow} title={e.error_reason}>
              <span className={s.errReason}>{e.error_reason}</span>
              <span className={s.breakCount}>{e.c}×</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className={s.card}>
        <div className={s.filterGrid}>
          <div>
            <label className={s.miniLabel}>Status</label>
            <select className={s.select} value={f.status} onChange={e => setF({ ...f, status: e.target.value })}>
              <option value="all">All Status</option>
              <option value="sent">✅ Sent</option>
              <option value="bounced">❌ Bounced</option>
              <option value="failed">⚠️ Failed</option>
            </select>
          </div>
          <div>
            <label className={s.miniLabel}>Bounce Type</label>
            <select className={s.select} value={f.detail} onChange={e => setF({ ...f, detail: e.target.value })}>
              <option value="all">All Types</option>
              <option value="hard_bounce">Hard Bounce</option>
              <option value="soft_bounce">Soft Bounce</option>
              <option value="rejected">Rejected (spam/blacklist)</option>
              <option value="auth_failed">Auth Failed (535)</option>
              <option value="ssl_error">SSL Error</option>
              <option value="rate_limited">Rate Limited</option>
              <option value="api_error">API Error</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <div>
            <label className={s.miniLabel}>Sender (email)</label>
            <input className={s.input} placeholder="info@..." value={f.sender} onChange={e => setF({ ...f, sender: e.target.value })} />
          </div>
          <div>
            <label className={s.miniLabel}>Template</label>
            <select className={s.select} value={f.template_id} onChange={e => setF({ ...f, template_id: e.target.value })}>
              <option value="all">All Templates</option>
              {templates.map(t2 => <option key={t2.id} value={t2.id}>{t2.name}</option>)}
            </select>
          </div>
          <div>
            <label className={s.miniLabel}>Step</label>
            <select className={s.select} value={f.step} onChange={e => setF({ ...f, step: e.target.value })}>
              <option value="all">All Steps</option>
              <option value="0">0 — Initial</option>
              <option value="1">1 — Follow-up 1</option>
              <option value="2">2 — Follow-up 2</option>
              <option value="3">3 — Follow-up 3</option>
            </select>
          </div>
          <div>
            <label className={s.miniLabel}>Via</label>
            <select className={s.select} value={f.via} onChange={e => setF({ ...f, via: e.target.value })}>
              <option value="all">Both</option>
              <option value="smtp">SMTP</option>
              <option value="api">Hostinger API</option>
            </select>
          </div>
          <div>
            <label className={s.miniLabel}>Country</label>
            <input className={s.input} placeholder="USA / US / UK..." value={f.country} onChange={e => setF({ ...f, country: e.target.value })} />
          </div>
          <div>
            <label className={s.miniLabel}>From Date</label>
            <input className={s.input} type="date" value={f.from} onChange={e => setF({ ...f, from: e.target.value })} />
          </div>
          <div>
            <label className={s.miniLabel}>To Date</label>
            <input className={s.input} type="date" value={f.to} onChange={e => setF({ ...f, to: e.target.value })} />
          </div>
          <div>
            <label className={s.miniLabel}>Search</label>
            <input className={s.input} placeholder="email / company / subject / error..." value={f.search} onChange={e => setF({ ...f, search: e.target.value })} />
          </div>
        </div>
        <div className={s.filterFoot}>
          <span><b>{total}</b> matching records • showing {emails.length} • click any row for full detail (events + all emails of that lead)</span>
          <div className={s.footBtns}>
            <button onClick={() => { setF({ status: 'all', detail: 'all', sender: '', template_id: 'all', step: 'all', via: 'all', country: '', search: '', from: '', to: '' }); }} className={s.btnGhost}>✕ Clear Filters</button>
            <button onClick={() => { setPage(0); fetchPage(0, false) }} className={s.btnGhost}>🔄 Refresh</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={s.card}>
        <div className={s.tableScroll} onScroll={e => {
          const { scrollTop, scrollHeight, clientHeight } = e.target
          if (scrollHeight - scrollTop <= clientHeight + 120 && hasMore && !loading) { const next = page + 1; setPage(next); fetchPage(next, true) }
        }}>
          <table className={s.table}>
            <thead className={s.thead}><tr>
              <th>Time</th><th>Lead Email</th><th>Name / Company</th><th>🌍 Country</th><th>Template</th><th>Step</th><th>Sender</th><th>Via</th><th>Status</th><th>Bounce/Reject Type</th><th>Error Reason</th><th>Open/Click/Reply</th>
            </tr></thead>
            <tbody>
              {emails.map(em => (
                <tr key={em.id} className={em.status === 'sent' ? s.rowSent : em.status === 'bounced' ? s.rowBounced : s.rowFailed} onClick={() => openDetail(em)}>
                  <td className={s.tdXs} style={{ whiteSpace: 'nowrap' }}>{new Date(em.sent_at).toLocaleString()}</td>
                  <td className={s.tdName}>{em.lead_email}</td>
                  <td className={s.tdSm}>{em.lead_name || '-'}<br /><span className={s.tdXs}>{em.company_name || ''}</span></td>
                  <td className={s.tdXs}>{em.country_code || '-'}<br /><span className={s.tdTiny}>{em.timezone || ''}</span></td>
                  <td className={s.tdEllip} title={em.template_name}>{em.template_name || em.template_id?.slice(0, 8) || '-'}</td>
                  <td><span className={s.stepBadge}>{em.step_type === 'initial' ? '📧 Init' : `FU${em.step}`}</span></td>
                  <td className={s.tdXs} style={{ fontWeight: 600 }}>{em.sender_email || '-'}</td>
                  <td><span className={em.via === 'api' ? s.viaApi : s.viaSmtp}>{em.via === 'api' ? '🔌 API' : '✉️ SMTP'}</span></td>
                  <td>
                    <span className={`${s.badge} ${em.status === 'sent' ? s.badgeSent : em.status === 'bounced' ? s.badgeBounced : s.badgeFailed}`}>
                      {em.status === 'sent' ? '✅ Sent' : em.status === 'bounced' ? '❌ Bounced' : '⚠️ Failed'}
                    </span>
                  </td>
                  <td>{em.status_detail ? <span className={`${s.badge} ${s[clsFor(em.status_detail)]}`}>{labelFor(em.status_detail)}</span> : <span className={s.tdTiny}>—</span>}</td>
                  <td className={s.tdError} title={em.error_reason}>{em.error_reason || '—'}</td>
                  <td className={s.trackCell}>
                    {em.open_count > 0 && <span className={s.trackOpen}>👁 {em.open_count}</span>}
                    {em.click_count > 0 && <span className={s.trackClick}>🔗 {em.click_count}</span>}
                    {em.has_reply > 0 && <span className={s.trackReply}>💬 Reply</span>}
                    {em.open_count === 0 && em.click_count === 0 && !em.has_reply && <span className={s.tdTiny}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className={s.loadNote}>⏳ Loading {LIMIT} more...</div>}
          {!loading && hasMore && <div className={s.loadNote} style={{ color: '#9ca3af' }}>Scroll for more — {total - emails.length} remaining</div>}
          {!loading && !hasMore && emails.length > 0 && <div className={s.loadNote} style={{ color: '#059669' }}>✅ All {total} loaded</div>}
          {emails.length === 0 && !loading && <div className={s.empty}>No email records yet. Jab bhi koi email send/bounce/fail hogi, yahan record hogi with full detail.</div>}
        </div>
      </div>

      {/* Detail Modal */}
      {sel && (
        <div className={s.modalOverlay} onClick={() => { setSel(null); setSelDetails(null) }}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <div className={s.modalTitle}>📋 Email Detail — {sel.lead_email}</div>
              <button onClick={() => { setSel(null); setSelDetails(null) }} className={s.modalClose}>✕ Close</button>
            </div>
            {detailLoading && <div className={s.empty}>⏳ Loading...</div>}
            {selDetails && (
              <div className={s.modalBody}>
                <div className={s.dGrid}>
                  <div className={s.dTile}><div className={s.dLabel}>STATUS</div><div className={`${s.badge} ${selDetails.email.status === 'sent' ? s.badgeSent : selDetails.email.status === 'bounced' ? s.badgeBounced : s.badgeFailed}`}>{selDetails.email.status}</div></div>
                  <div className={s.dTile}><div className={s.dLabel}>BOUNCE/REJECT TYPE</div><div>{selDetails.email.status_detail ? <span className={`${s.badge} ${s[clsFor(selDetails.email.status_detail)]}`}>{labelFor(selDetails.email.status_detail)}</span> : '—'}</div></div>
                  <div className={s.dTile}><div className={s.dLabel}>SENDER</div><div className={s.dValueSm}>{selDetails.email.sender_email} <span className={s.tdXs}>({selDetails.email.via})</span></div></div>
                  <div className={s.dTile}><div className={s.dLabel}>TEMPLATE</div><div className={s.dValueSm}>{selDetails.email.template_name || '-'}</div></div>
                  <div className={s.dTile}><div className={s.dLabel}>STEP</div><div className={s.dValueSm}>{selDetails.email.step_type} (#{selDetails.email.step})</div></div>
                  <div className={s.dTile}><div className={s.dLabel}>COUNTRY / TZ</div><div className={s.dValueSm}>{selDetails.email.country} ({selDetails.email.country_code}) • {selDetails.email.timezone}</div></div>
                  <div className={s.dTile}><div className={s.dLabel}>TIME</div><div className={s.dValueSm}>{new Date(selDetails.email.sent_at).toLocaleString()}</div></div>
                  <div className={s.dTile}><div className={s.dLabel}>SUBJECT</div><div className={s.dValueSm}>{selDetails.email.subject || '-'}</div></div>
                </div>

                {selDetails.email.error_reason && (
                  <div className={s.errBox}>
                    <div className={s.errBoxTitle}>❌ Full Error / Reject Reason:</div>
                    <div className={s.errBoxText}>{selDetails.email.error_reason}</div>
                  </div>
                )}

                <div className={s.leadStatusBox}>
                  <b>Lead status ab:</b> {selDetails.email.lead_status || '—'} • Opens {selDetails.email.open_count || 0} • Clicks {selDetails.email.click_count || 0} {selDetails.email.lead_bounce_reason && <>• Bounce: {selDetails.email.lead_bounce_reason}</>}
                </div>

                <div className={s.historyBox}>
                  <div className={s.historyTitle}>📋 Is lead ki SAARI emails (timeline, purani→nayi):</div>
                  {(selDetails.allForLead || []).map(h => (
                    <div key={h.id} className={s.historyRow}>
                      <span className={s.tdXs}>{new Date(h.sent_at).toLocaleString()}</span>
                      <span className={`${s.badge} ${h.status === 'sent' ? s.badgeSent : h.status === 'bounced' ? s.badgeBounced : s.badgeFailed}`}>{h.status}</span>
                      <span className={s.tdXs}>{h.step_type} • {h.sender_email} • {h.via}{h.status_detail ? ` • ${labelFor(h.status_detail)}` : ''}</span>
                      {h.error_reason && <div className={s.historyError}>❌ {h.error_reason}</div>}
                    </div>
                  ))}
                </div>

                <div className={s.eventsBox}>
                  <div className={s.eventsTitle}>📜 Events (open/click/reply/unsub...):</div>
                  {(selDetails.events || []).length === 0 && <div className={s.tdXs}>Koi event nahi</div>}
                  {(selDetails.events || []).map(ev => (
                    <div key={ev.id} className={s.eventRow}>
                      <span className={s.eventType}>{ev.type}</span>
                      <span className={s.tdXs}>{new Date(ev.created_at).toLocaleString()}</span>
                      <span className={s.eventMeta}>{ev.meta?.slice(0, 120) || ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
