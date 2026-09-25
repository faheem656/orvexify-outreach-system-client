import React, { useState, useEffect, useRef, useCallback } from 'react'
import s from './Leads.module.css'
import { apiUrl } from '../config.js'
import { useApp } from '../context/AppContext.jsx'

const COUNTRY_OPTIONS = [
  { code: 'US', name: 'United States', flag: '🇺🇸', tz: 'America/New_York' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', tz: 'Europe/London' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', tz: 'America/Toronto' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', tz: 'Australia/Sydney' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', tz: 'Europe/Berlin' },
  { code: 'FR', name: 'France', flag: '🇫🇷', tz: 'Europe/Paris' },
  { code: 'AE', name: 'UAE/Dubai', flag: '🇦🇪', tz: 'Asia/Dubai' },
  { code: 'IN', name: 'India', flag: '🇮🇳', tz: 'Asia/Kolkata' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', tz: 'Asia/Karachi' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', tz: 'Asia/Singapore' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', tz: 'Asia/Tokyo' },
]

export default function Leads() {
  const { templates, stats, refresh } = useApp()
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [leads, setLeads] = useState([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [manual, setManual] = useState({ first_name: '', last_name: '', title: '', company_name: '', email: '', country: 'United States', timezone: 'America/New_York' })
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [subFilter, setSubFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [page, setPage] = useState(0)
  const LIMIT = 50
  const observerRef = useRef(null)

  useEffect(() => {
    if (templates.length && !selectedTemplate) setSelectedTemplate(templates[0])
  }, [templates, selectedTemplate])

  const fetchLeads = useCallback(async (pageNum = 0, append = false) => {
    if (!selectedTemplate) return
    if (loading) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (countryFilter !== 'all') params.set('country', countryFilter)
      if (search) params.set('search', search)
      if (subFilter === 'sub') params.set('subscribed', 'true')
      if (subFilter === 'unsub') params.set('subscribed', 'false')
      params.set('limit', LIMIT)
      params.set('offset', pageNum * LIMIT)
      const res = await fetch(apiUrl(`/api/templates/${selectedTemplate.id}/leads?${params.toString()}`))
      const text = await res.text()
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) { setLoading(false); return }
      const data = JSON.parse(text)
      if (Array.isArray(data)) { setLeads(data); setTotal(data.length); setHasMore(false) }
      else {
        setTotal(data.total || 0); setHasMore(data.hasMore || false)
        if (append) setLeads(prev => [...prev, ...(data.leads || [])])
        else setLeads(data.leads || [])
      }
      if (!append) setSelectedIds(new Set())
    } catch { /* ignore */ }
    setLoading(false)
  }, [selectedTemplate, statusFilter, search, subFilter, countryFilter, loading])

  useEffect(() => { setPage(0); fetchLeads(0, false) }, [selectedTemplate, statusFilter, subFilter, countryFilter])
  useEffect(() => { if (search) { const t = setTimeout(() => { setPage(0); fetchLeads(0, false) }, 400); return () => clearTimeout(t) } }, [search, fetchLeads])

  const lastLeadRef = useCallback(node => {
    if (loading) return
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        const nextPage = page + 1; setPage(nextPage); fetchLeads(nextPage, true)
      }
    })
    if (node) observerRef.current.observe(node)
  }, [loading, hasMore, page, fetchLeads])

  const uploadCSV = async (e) => {
    const file = e.target.files[0]
    if (!file || !selectedTemplate) return alert('Pehle template select karo')
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch(apiUrl(`/api/templates/${selectedTemplate.id}/leads/upload`), { method: 'POST', body: fd })
      const text = await res.text()
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) { alert('❌ Server not running!'); setUploading(false); return }
      const data = JSON.parse(text); setUploading(false)
      if (data.inserted !== undefined) {
        alert(`✅ ${data.inserted} leads added with Country+Timezone!\n${data.skipped} skipped duplicate\n${data.unsubSkipped || 0} skipped global unsub`)
        setPage(0); fetchLeads(0, false); refresh()
      } else alert('❌ ' + data.error)
    } catch (err) { setUploading(false); alert('❌ ' + err.message) }
    e.target.value = ''
  }

  const addManual = async (e) => {
    e.preventDefault()
    if (!selectedTemplate) return alert('Template select karo')
    const res = await fetch(apiUrl(`/api/templates/${selectedTemplate.id}/leads/manual`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(manual) })
    const data = await res.json()
    if (data.id) { alert(`✅ Lead added - Country: ${data.country} Timezone: ${data.timezone}`); setManual({ first_name: '', last_name: '', title: '', company_name: '', email: '', country: 'United States', timezone: 'America/New_York' }); setPage(0); fetchLeads(0, false); refresh() }
    else alert('❌ ' + data.error)
  }

  const deleteLead = async (id) => {
    if (!confirm('Delete this lead?')) return
    await fetch(apiUrl(`/api/leads/${id}`), { method: 'DELETE' })
    setLeads(prev => prev.filter(l => l.id !== id)); refresh()
  }

  const toggleSub = async (lead) => {
    const isSub = lead.is_subscribed === 1 && lead.status !== 'unsubscribed'
    const action = isSub ? 'unsubscribe' : 'subscribe'
    if (!confirm(isSub ? `Unsubscribe ${lead.email}?` : `Subscribe ${lead.email}?`)) return
    await fetch(apiUrl(`/api/leads/${lead.id}/${action}`), { method: 'POST' })
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, is_subscribed: isSub ? 0 : 1, status: isSub ? 'unsubscribed' : 'pending' } : l))
    refresh()
  }

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleSelectAll = () => setSelectedIds(prev => prev.size === leads.length ? new Set() : new Set(leads.map(l => l.id)))

  const bulkDeleteSelected = async () => {
    if (selectedIds.size === 0) return alert('Koi lead select nahi')
    if (!confirm(`Delete ${selectedIds.size} selected?`)) return
    const data = await fetch(apiUrl(`/api/templates/${selectedTemplate.id}/leads/bulk-delete`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: Array.from(selectedIds) }) }).then(r => r.json())
    alert(`✅ ${data.deleted} deleted`); setLeads(prev => prev.filter(l => !selectedIds.has(l.id))); setSelectedIds(new Set()); refresh()
  }

  const bulkAction = async (action) => {
    if (selectedIds.size === 0) return alert('Select leads first')
    const label = action === 'unsubscribe' ? 'Unsubscribe' : action === 'subscribe' ? 'Subscribe' : 'Reset'
    if (!confirm(`${label} ${selectedIds.size} selected?`)) return
    const data = await fetch(apiUrl(`/api/templates/${selectedTemplate.id}/leads/bulk-action`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: Array.from(selectedIds), action }) }).then(r => r.json())
    alert(`✅ ${data.affected} ${label}`); setPage(0); fetchLeads(0, false); refresh()
  }

  const bulkCountry = async () => {
    if (selectedIds.size === 0) return alert('Select leads first')
    const country = prompt('Country set karo (e.g. USA, UK, Canada, Australia, Germany, UAE, India, Pakistan):', 'USA')
    if (!country) return
    const data = await fetch(apiUrl(`/api/templates/${selectedTemplate.id}/leads/bulk-country`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: Array.from(selectedIds), country }) }).then(r => r.json())
    alert(`✅ ${data.affected} leads → ${data.flag} ${data.country} (${data.timezone})`); setPage(0); fetchLeads(0, false); refresh()
  }

  const deleteAllLeads = async () => {
    if (!selectedTemplate) return
    const type = prompt(`Type DELETE to delete ALL ${total} leads:\n- DELETE for all\n- pending/sent/bounced/unsubscribed`)
    if (!type) return
    if (type === 'DELETE') {
      if (!confirm(`FINAL: Delete ALL ${total}?`)) return
      const data = await fetch(apiUrl(`/api/templates/${selectedTemplate.id}/leads/bulk-delete`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) }).then(r => r.json())
      alert(`✅ ${data.deleted} deleted`); setLeads([]); setTotal(0); refresh()
    } else if (['pending', 'sent', 'bounced', 'opened', 'clicked', 'replied', 'unsubscribed', 'unsub'].includes(type.toLowerCase())) {
      const st = type.toLowerCase() === 'unsub' ? 'unsubscribed' : type.toLowerCase()
      if (!confirm(`Delete all ${st}?`)) return
      const data = await fetch(apiUrl(`/api/templates/${selectedTemplate.id}/leads/bulk-delete`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: st }) }).then(r => r.json())
      alert(`✅ ${data.deleted} ${st} deleted`); setPage(0); fetchLeads(0, false); refresh()
    }
  }

  const resetAllLeads = async () => {
    if (!selectedTemplate) return
    if (!confirm(`Reset ALL ${total} to pending? (sub only)`)) return
    const data = await fetch(apiUrl(`/api/templates/${selectedTemplate.id}/leads/reset`), { method: 'POST' }).then(r => r.json())
    alert(`✅ ${data.updated} reset`); setPage(0); fetchLeads(0, false); refresh()
  }

  const exportCSV = () => {
    if (leads.length === 0) return alert('No leads')
    const headers = ['First Name', 'Last Name', 'Title', 'Company Name', 'Email', 'Country', 'Timezone', 'Status', 'Sub']
    const rows = leads.map(l => {
      let custom = {}; try { custom = JSON.parse(l.custom_json || '{}') } catch { /* ignore */ }
      const fn = l.first_name || custom['First Name'] || ''
      const ln = l.last_name || custom['Last Name'] || ''
      const ttl = custom.title || custom.Title || ''
      const comp = l.clinic_name || custom.company_name || custom['Company Name'] || ''
      return [fn, ln, ttl, comp, l.email, l.country || 'USA', l.timezone || 'America/New_York', l.status, l.is_subscribed ? 'Sub' : 'Unsub'].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${selectedTemplate?.name || 'leads'}-${new Date().toISOString().split('T')[0]}.csv`; a.click()
  }

  const safeLeads = Array.isArray(leads) ? leads : []
  const allSelected = safeLeads.length > 0 && selectedIds.size === safeLeads.length
  const getDisplay = (lead) => {
    let custom = {}; try { custom = JSON.parse(lead.custom_json || '{}') } catch { /* ignore */ }
    return {
      first_name: lead.first_name || custom['First Name'] || custom.first_name || '',
      last_name: lead.last_name || custom['Last Name'] || custom.last_name || '',
      title: custom.title || custom.Title || '',
      company_name: lead.clinic_name || custom.company_name || custom['Company Name'] || custom.Company || '',
      country: lead.country || custom.Country || 'USA',
      country_code: lead.country_code || 'US',
      timezone: lead.timezone || 'America/New_York',
    }
  }
  const flagFor = (code) => COUNTRY_OPTIONS.find(x => x.code === code)?.flag || '🏳️'

  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <div className={s.header}>
          <div>
            <div className={s.title}>👥 Leads — Country + Timezone System 🌍</div>
            <div className={s.sub}>Har lead ka mulk + local time pe send (9am-5pm uske timezone me). CSV: First Name, Last Name, Title, Company Name, Email, Country, Timezone (optional). Default US + America/New_York. Total {total} loaded {safeLeads.length}</div>
          </div>
          <div className={s.controls}>
            <select className={s.select} style={{ width: 200 }} value={selectedTemplate?.id || ''} onChange={e => setSelectedTemplate(templates.find(x => x.id === e.target.value))}>
              <option value="">Select Template</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name} — {t.totalDailyCapacity}/day</option>)}
            </select>
            <label className={s.btnPrimary} style={{ cursor: 'pointer' }}>
              {uploading ? 'Uploading...' : '📤 Upload CSV (Country+TZ)'}
              <input type="file" accept=".csv" onChange={uploadCSV} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {stats?.countryBreakdown?.length > 0 && (
          <div className={s.countryChips}>
            {stats.countryBreakdown.map(cb => (
              <div key={cb.country_code} className={s.countryChip}>
                <span style={{ fontSize: 14 }}>{cb.flag}</span> <b>{cb.country_code}</b> {cb.country} — {cb.total} leads (P:{cb.pending} S:{cb.sent}) — {cb.timezone}
              </div>
            ))}
          </div>
        )}

        {selectedTemplate && (
          <div className={s.queueBox}>
            <div className={s.queueItem}><div className={s.queueLabel}>Template</div><div className={s.queueValueSm}>{selectedTemplate.name}</div></div>
            <div className={s.queueItem}><div className={s.queueLabel}>Total / Loaded</div><div className={s.queueValue}>{total} / {safeLeads.length}</div></div>
            <div className={s.queueItem}><div className={s.queueLabel}>Sub ✅</div><div className={s.queueValue} style={{ color: '#059669' }}>{stats?.subscribed || 0}</div></div>
            <div className={s.queueItem}><div className={s.queueLabel}>Window</div><div className={s.queueValueSm}>{stats?.sendWindow || '0-23 local'}</div></div>
            <div className={s.queueItem}><div className={s.queueLabel}>TZ Mode</div><div className={s.queueValueSm} style={{ color: '#7c3aed' }}>🌍 Per-lead local 9-5</div></div>
          </div>
        )}
      </div>

      <div className={s.card}>
        <div className={s.sectionTitle}>➕ Manual Add — With Country + Timezone 🌍</div>
        <form onSubmit={addManual} className={s.manualGrid}>
          <input className={s.input} placeholder="First Name *" value={manual.first_name} onChange={e => setManual({ ...manual, first_name: e.target.value })} />
          <input className={s.input} placeholder="Last Name" value={manual.last_name} onChange={e => setManual({ ...manual, last_name: e.target.value })} />
          <input className={s.input} placeholder="Title (e.g. CEO)" value={manual.title} onChange={e => setManual({ ...manual, title: e.target.value })} />
          <input className={s.input} placeholder="Company Name *" value={manual.company_name} onChange={e => setManual({ ...manual, company_name: e.target.value })} />
          <input className={s.input} placeholder="Email *" required value={manual.email} onChange={e => setManual({ ...manual, email: e.target.value })} />
          <select className={s.select} value={manual.country} onChange={e => {
            const opt = COUNTRY_OPTIONS.find(c => c.name === e.target.value)
            setManual({ ...manual, country: e.target.value, timezone: opt ? opt.tz : manual.timezone })
          }}>
            {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name} — {c.code}</option>)}
          </select>
          <select className={s.select} value={manual.timezone} onChange={e => setManual({ ...manual, timezone: e.target.value })}>
            <option value="America/New_York">EST — New York (USA East)</option>
            <option value="America/Chicago">CST — Chicago (USA Central)</option>
            <option value="America/Denver">MST — Denver (USA Mountain)</option>
            <option value="America/Los_Angeles">PST — Los Angeles (USA West)</option>
            <option value="America/Toronto">EST — Toronto (Canada)</option>
            <option value="Europe/London">GMT — London (UK)</option>
            <option value="Europe/Berlin">CET — Berlin (Germany)</option>
            <option value="Asia/Dubai">GST — Dubai (UAE)</option>
            <option value="Asia/Karachi">PKT — Karachi (Pakistan)</option>
            <option value="Asia/Kolkata">IST — Kolkata (India)</option>
            <option value="Australia/Sydney">AEDT — Sydney (Australia)</option>
          </select>
          <button type="submit" className={s.btnPrimary} style={{ gridColumn: '1 / -1' }}>Add Lead — {manual.country} {manual.timezone} — Vars {'{{country}}'} {'{{company_name}}'}</button>
        </form>
      </div>

      <div className={s.card}>
        <div className={s.tableHead}>
          <div className={s.tableTitle}>Leads {selectedTemplate?.name || ''} — {safeLeads.length}/{total} {hasMore ? '(scroll for more)' : '(all)'} {selectedIds.size > 0 && `${selectedIds.size} sel`}</div>
          <div className={s.tableFilters}>
            <input className={s.input} placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 130, padding: '6px 10px', fontSize: 12 }} />
            <select className={s.select} value={countryFilter} onChange={e => setCountryFilter(e.target.value)} style={{ width: 110, padding: '6px 8px', fontSize: 11 }}>
              <option value="all">All Countries</option>
              {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
            </select>
            <select className={s.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 110, padding: '6px 8px', fontSize: 11 }}>
              <option value="all">All Status</option><option value="pending">Pending</option><option value="sent">Sent</option><option value="bounced">Bounced</option><option value="unsubscribed">Unsub</option>
            </select>
            <select className={s.select} value={subFilter} onChange={e => setSubFilter(e.target.value)} style={{ width: 100, padding: '6px 8px', fontSize: 11 }}>
              <option value="all">All Sub</option><option value="sub">✅ Sub</option><option value="unsub">❌ Unsub</option>
            </select>
            <button onClick={() => { setPage(0); fetchLeads(0, false) }} className={s.btnIcon}>🔄</button>
          </div>
        </div>

        <div className={s.bulkBar}>
          <label className={s.bulkLabel}>
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
            {allSelected ? 'Deselect' : `Select All ${safeLeads.length}`}
          </label>
          <button onClick={bulkDeleteSelected} disabled={selectedIds.size === 0} className={`${s.bulkBtn} ${s.bulkDel}`}>🗑️ Del Sel ({selectedIds.size})</button>
          <button onClick={bulkCountry} disabled={selectedIds.size === 0} className={`${s.bulkBtn} ${s.bulkGreen}`}>🌍 Set Country ({selectedIds.size})</button>
          <button onClick={() => bulkAction('unsubscribe')} disabled={selectedIds.size === 0} className={`${s.bulkBtn} ${s.bulkYellow}`}>❌ Unsub</button>
          <button onClick={() => bulkAction('subscribe')} disabled={selectedIds.size === 0} className={`${s.bulkBtn} ${s.bulkGreen}`}>✅ Sub</button>
          <button onClick={() => bulkAction('reset')} disabled={selectedIds.size === 0} className={`${s.bulkBtn} ${s.bulkBlue}`}>🔄 Reset</button>
          <button onClick={exportCSV} className={`${s.bulkBtn} ${s.bulkBlue}`}>📤 Export</button>
          <button onClick={resetAllLeads} className={`${s.bulkBtn} ${s.bulkGreen}`}>🔄 Reset ALL</button>
          <button onClick={deleteAllLeads} className={`${s.bulkBtn} ${s.bulkDelSolid}`}>⚠️ Del ALL</button>
        </div>

        <div className={s.tableScroll} onScroll={e => {
          const { scrollTop, scrollHeight, clientHeight } = e.target
          if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loading) {
            const nextPage = page + 1; setPage(nextPage); fetchLeads(nextPage, true)
          }
        }}>
          <table className={s.table}>
            <thead className={s.thead}><tr><th><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /></th><th>First Name</th><th>Last Name</th><th>Title</th><th>Company</th><th>Email</th><th>🌍 Country</th><th>Timezone</th><th>Status</th><th>Sub</th><th>Action</th></tr></thead>
            <tbody>
              {safeLeads.map((l, idx) => {
                const isSub = l.is_subscribed !== 0 && l.status !== 'unsubscribed'
                const disp = getDisplay(l)
                return (
                  <tr key={l.id} ref={idx === safeLeads.length - 1 ? lastLeadRef : null} className={selectedIds.has(l.id) ? s.rowSel : !isSub ? s.rowUnsub : ''}>
                    <td><input type="checkbox" checked={selectedIds.has(l.id)} onChange={() => toggleSelect(l.id)} /></td>
                    <td className={s.td12}>{disp.first_name}</td>
                    <td className={s.td12}>{disp.last_name}</td>
                    <td className={s.tdEllip} style={{ maxWidth: 100 }}>{disp.title}</td>
                    <td className={s.tdEllip} style={{ maxWidth: 130, fontWeight: 600 }}>{disp.company_name}</td>
                    <td className={s.td11b}>{l.email}</td>
                    <td className={s.td11}>{flagFor(disp.country_code)} {disp.country} ({disp.country_code})</td>
                    <td className={s.td10}>{disp.timezone}</td>
                    <td><span className={`${s.badge} ${l.status === 'pending' ? s.badgePending : l.status === 'sent' ? s.badgeSent : l.status === 'unsubscribed' ? s.badgeUnsub : s.badgeBounced}`}>{l.status}</span></td>
                    <td><button onClick={() => toggleSub(l)} className={isSub ? s.subPillOn : s.subPillOff}>{isSub ? '✅ Sub' : '❌ Unsub'}</button></td>
                    <td className={s.tdActions}><button onClick={() => toggleSub(l)} className={s.miniBtn}>{isSub ? 'Unsub' : 'Sub'}</button><button onClick={() => deleteLead(l.id)} className={`${s.miniBtn} ${s.miniDel}`}>Del</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {loading && <div className={s.loadNote}>⏳ Loading {LIMIT} more... scroll auto load</div>}
          {!loading && hasMore && <div className={s.loadNote} style={{ color: '#9ca3af' }}>Scroll down for more — {total - safeLeads.length} remaining</div>}
          {!loading && !hasMore && safeLeads.length > 0 && <div className={s.loadNote} style={{ color: '#059669' }}>✅ All {total} loaded</div>}
          {safeLeads.length === 0 && !loading && <div className={s.empty}>No leads. Upload CSV with: First Name, Last Name, Title, Company Name, Email, Country, Timezone — default US</div>}
        </div>
      </div>

      <div className={s.card}>
        <div className={s.sectionTitleSm}>📄 Sample CSV — With Country + Timezone</div>
        <div className={s.codeBlock}>First Name,Last Name,Title,Company Name,Email,Country,Timezone
John,Doe,CEO,Acme Corp,john@acme.com,USA,America/New_York
Sarah,Smith,Manager,Bright Smile,sarah@clinic.com,UK,Europe/London
Ahmed,Khan,Director,Dubai Clinic,ahmed@clinic.ae,UAE,Asia/Dubai
// Vars: {'{{first_name}}'} {'{{country}}'} {'{{company_name}}'}
// If Country blank → defaults to USA + America/New_York</div>
      </div>
    </div>
  )
}
