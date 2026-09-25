import React, { useState, useEffect } from 'react'
import s from './Senders.module.css'
import { apiUrl } from '../config.js'
import { useApp } from '../context/AppContext.jsx'

const DEFAULT_FORM = { from_name: 'Orvexify', smtp_host: 'smtp.hostinger.com', smtp_port: 587, smtp_secure: false, smtp_user: '', smtp_pass: '', daily_limit: 50, hourly_limit: 20 }

export default function Senders() {
  const { refresh } = useApp()
  const [senders, setSenders] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [bulk, setBulk] = useState('')
  const [loading, setLoading] = useState(false)
  const [customLimits, setCustomLimits] = useState({})

  // Hostinger Mail API
  const [hgSettings, setHgSettings] = useState(null)
  const [hgKey, setHgKey] = useState('')
  const [hgVia, setHgVia] = useState('auto')
  const [hgPub, setHgPub] = useState('')
  const [hgSecret, setHgSecret] = useState('')
  const [hgMsg, setHgMsg] = useState(null)

  const fetchSenders = async () => {
    const res = await fetch(apiUrl('/api/senders')).then(r => r.text()).catch(() => null)
    if (!res || res.trim().startsWith('<!doctype') || res.trim().startsWith('<html')) { setSenders([]); return }
    const data = JSON.parse(res)
    setSenders(Array.isArray(data) ? data : [])
    if (refresh) refresh()
  }
  const fetchHgSettings = async () => {
    const data = await fetch(apiUrl('/api/settings')).then(r => r.text()).then(t => {
      if (t.trim().startsWith('<!doctype') || t.trim().startsWith('<html')) return null
      try { return JSON.parse(t) } catch { return null }
    }).catch(() => null)
    if (data) { setHgSettings(data); if (data.send_via) setHgVia(data.send_via); if (data.public_base_url) setHgPub(data.public_base_url) }
  }
  useEffect(() => { fetchSenders(); fetchHgSettings() }, [])

  const saveHg = async (e) => {
    e.preventDefault()
    setHgMsg({ type: 'busy', text: 'Saving settings...' })
    try {
      const payload = { send_via: hgVia, public_base_url: hgPub }
      if (hgKey) payload.api_key = hgKey
      if (hgSecret) payload.webhook_secret = hgSecret
      const data = await fetch(apiUrl('/api/settings'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json())
      if (data.ok) {
        if (data.apiTest) {
          setHgMsg(data.apiTest.ok
            ? { type: 'ok', text: `✅ Saved! API key kaam kar rahi hai — ${data.apiTest.mailboxes?.length || 0} mailboxes found. ${data.linkResult?.linked || 0} senders API se linked.` }
            : { type: 'err', text: `❌ ${data.apiTest.error}` })
        } else setHgMsg({ type: 'ok', text: '✅ Settings saved' })
        setHgKey(''); setHgSecret('')
        fetchHgSettings(); fetchSenders()
      } else setHgMsg({ type: 'err', text: '❌ Failed to save' })
    } catch (err) { setHgMsg({ type: 'err', text: '❌ ' + err.message }) }
  }

  const testHg = async () => {
    setHgMsg({ type: 'busy', text: 'Testing API key + linking senders...' })
    const data = await fetch(apiUrl('/api/hostinger/test'), { method: 'POST' }).then(r => r.json()).catch(() => ({ ok: false, error: 'Network error' }))
    if (data.ok) {
      setHgMsg({ type: 'ok', text: `✅ API working! ${data.mailboxCount} mailboxes: ${data.mailboxes.map(m => m.address).join(', ') || 'none'}. ${data.linkedCount} senders auto-linked.` })
      fetchHgSettings(); fetchSenders()
    } else setHgMsg({ type: 'err', text: `❌ ${data.error}\n💡 ${data.hint || ''}` })
  }

  const setupWebhook = async () => {
    setHgMsg({ type: 'busy', text: 'Creating webhooks on all linked mailboxes...' })
    const data = await fetch(apiUrl('/api/hostinger/setup-webhook'), { method: 'POST' }).then(r => r.json()).catch(() => ({ ok: false, error: 'Network error' }))
    if (data.ok) { setHgMsg({ type: 'ok', text: `✅ ${data.note}\nWebhook URL: ${data.webhookUrl}` }); fetchHgSettings() }
    else setHgMsg({ type: 'err', text: '❌ ' + data.error })
  }

  const resumeSender = async (id) => {
    await fetch(apiUrl(`/api/senders/${id}`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auto_paused_at: null }) })
    fetchSenders()
  }

  const handlePortChange = (port) => {
    const p = parseInt(port) || 587
    let secure = false
    if (p === 465) secure = true
    else if (p === 587 || p === 25 || p === 2525) secure = false
    setForm({ ...form, smtp_port: p, smtp_secure: secure })
  }

  const handleHostPreset = (host) => {
    if (host.includes('gmail')) setForm({ ...form, smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_secure: false })
    else if (host.includes('zoho')) setForm({ ...form, smtp_host: 'smtp.zoho.com', smtp_port: 587, smtp_secure: false })
    else if (host.includes('outlook') || host.includes('office365')) setForm({ ...form, smtp_host: 'smtp.office365.com', smtp_port: 587, smtp_secure: false })
    else if (host.includes('hostinger')) setForm({ ...form, smtp_host: 'smtp.hostinger.com', smtp_port: 587, smtp_secure: false })
    else if (host.includes('orvexify')) setForm({ ...form, smtp_host: host, smtp_port: 587, smtp_secure: false })
    else setForm({ ...form, smtp_host: host })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const url = editingId ? apiUrl(`/api/senders/${editingId}`) : apiUrl('/api/senders')
    const method = editingId ? 'PUT' : 'POST'
    const payload = { ...form, daily_limit: parseInt(form.daily_limit) || 30, hourly_limit: parseInt(form.hourly_limit) || 8 }
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.text()).catch(() => null)
    setLoading(false)
    if (!res || res.trim().startsWith('<!doctype') || res.trim().startsWith('<html')) return alert('❌ Server not running')
    const data = JSON.parse(res)
    if (data.id || data.ok) {
      alert(editingId ? `✅ Sender updated! Daily ${payload.daily_limit}/day Hourly ${payload.hourly_limit}/hr` : `✅ Sender added! ${payload.daily_limit}/day ${payload.hourly_limit}/hr — SSL auto-fixed`)
      setEditingId(null); setForm(DEFAULT_FORM); fetchSenders()
    } else alert('❌ ' + (data.error || 'Failed'))
  }

  const startEdit = (sender) => {
    setEditingId(sender.id)
    setForm({
      from_name: sender.from_name || '', smtp_host: sender.smtp_host || 'smtp.hostinger.com', smtp_port: sender.smtp_port || 587,
      smtp_secure: sender.smtp_port === 465, smtp_user: sender.smtp_user || '', smtp_pass: '',
      daily_limit: sender.daily_limit || 30, hourly_limit: sender.hourly_limit || 8,
    })
    window.scrollTo({ top: 400, behavior: 'smooth' })
  }
  const cancelEdit = () => { setEditingId(null); setForm(DEFAULT_FORM) }

  const updateLimit = async (id, field, value) => {
    const num = parseInt(value)
    if (isNaN(num) || num < 1) return alert('Limit must be >=1')
    if (num > 1000) return alert('Max 1000/day for safety')
    const payload = {}; payload[field] = num
    await fetch(apiUrl(`/api/senders/${id}`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    fetchSenders()
  }

  const updateCustomLimitInline = (id, field, value) => setCustomLimits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))

  const saveCustomLimit = async (id) => {
    const custom = customLimits[id]
    if (!custom) return
    const payload = {}
    if (custom.daily_limit !== undefined && custom.daily_limit !== '') {
      const d = parseInt(custom.daily_limit)
      if (!isNaN(d) && d >= 1 && d <= 1000) payload.daily_limit = d
    }
    if (custom.hourly_limit !== undefined && custom.hourly_limit !== '') {
      const h = parseInt(custom.hourly_limit)
      if (!isNaN(h) && h >= 1 && h <= 200) payload.hourly_limit = h
    }
    if (Object.keys(payload).length === 0) return
    await fetch(apiUrl(`/api/senders/${id}`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setCustomLimits(prev => { const n = { ...prev }; delete n[id]; return n })
    fetchSenders()
  }

  const testSender = async (id) => {
    const data = await fetch(apiUrl(`/api/senders/${id}/test`), { method: 'POST' }).then(r => r.json()).catch(e => ({ ok: false, error: e.message }))
    if (data.ok) alert(`✅ ${data.message}`)
    else alert(`❌ ${data.error}\n\n💡 Fix: ${data.hint || 'Check host/port/user/pass'}`)
  }

  const deleteSender = async (id) => {
    if (!confirm('Delete this sender? All its leads will remain but unassigned.')) return
    await fetch(apiUrl(`/api/senders/${id}`), { method: 'DELETE' })
    fetchSenders()
  }

  const bulkAdd = async () => {
    const lines = bulk.split('\n').filter(l => l.trim())
    const parsed = lines.map((line, idx) => {
      if (!line.includes(',')) return null
      const parts = line.split(',').map(v => v.trim())
      const [email, pass, name, daily, hourly] = parts
      if (!email || !pass) return null
      return {
        from_name: name || `Orvexify ${senders.length + idx + 1}`, smtp_host: form.smtp_host, smtp_port: form.smtp_port, smtp_secure: form.smtp_port === 465,
        smtp_user: email, smtp_pass: pass,
        daily_limit: daily ? parseInt(daily) : parseInt(form.daily_limit) || 50,
        hourly_limit: hourly ? parseInt(hourly) : parseInt(form.hourly_limit) || 20,
      }
    }).filter(Boolean)
    if (parsed.length === 0) return alert('Format: email,password,From Name,daily_limit(optional),hourly_limit(optional)\nExample: info@orvexify.com,pass123,Orvexify Sales,50,20')
    const data = await fetch(apiUrl('/api/senders/bulk'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senders: parsed }) }).then(r => r.json())
    alert(`✅ ${data.count} senders added! Each ${form.daily_limit}/day ${form.hourly_limit}/hr — SSL auto-fixed`)
    setBulk(''); fetchSenders()
  }

  const totalCap = senders.reduce((sum, i) => sum + i.daily_limit, 0)
  const totalSent = senders.reduce((sum, i) => sum + i.sent_today, 0)
  const totalRem = totalCap - totalSent
  const totalHourlyCap = senders.reduce((sum, i) => sum + i.hourly_limit, 0)
  const sslMismatch = form.smtp_port === 465 && !form.smtp_secure || form.smtp_port === 587 && form.smtp_secure

  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <div className={s.totalBar}>
          <div className={s.totalItem}><div className={s.totalLabel}>Total Senders</div><div className={s.totalValue}>{senders.length}</div></div>
          <div className={s.totalItem}><div className={s.totalLabel}>Total Daily Capacity</div><div className={s.totalValue}>{totalCap}/day</div><div className={s.totalNote}>{senders.length} senders × avg {senders.length ? Math.round(totalCap / senders.length) : 0}/day = {totalCap}/day<br />Hourly: {totalHourlyCap}/hr total</div></div>
          <div className={s.totalItem}><div className={s.totalLabel}>Sent Today</div><div className={s.totalValue}>{totalSent}</div></div>
          <div className={s.totalItem}><div className={s.totalLabel}>Remaining</div><div className={s.totalValue} style={{ color: totalRem === 0 ? '#ef4444' : '#10b981' }}>{totalRem}</div></div>
        </div>
        <div className={s.title}>📧 Sender Emails & Limits — CUSTOM LIMITS ✅</div>
        <div className={s.sub}>Ab har sender ki limit custom set kar sakte ho — jitni chaho! Daily: 1-1000, Hourly: 1-200. Presets + custom input. Bulk add me bhi custom.</div>

        <div className={s.inboxGrid}>
          {senders.map(sender => {
            const pct = Math.min(100, (sender.sent_today / sender.daily_limit) * 100)
            const isFull = sender.remaining_today === 0
            const custom = customLimits[sender.id] || {}
            return (
              <div key={sender.id} className={s.inboxCard} style={{ borderColor: isFull ? '#fde68a' : editingId === sender.id ? '#6366f1' : undefined, background: isFull ? '#fffbeb' : editingId === sender.id ? '#eef2ff' : 'white' }}>
                <div className={s.inboxTop}>
                  <div>
                    <div className={s.inboxName}>{sender.from_name} {editingId === sender.id && '(Editing)'} {sender.has_password === false && '🔴 NO PASS'}</div>
                    <div className={s.inboxEmail}>{sender.smtp_user}</div>
                    <div className={s.inboxMeta}>{sender.smtp_host}:{sender.smtp_port} {sender.smtp_port === 465 ? 'secure ON' : 'secure OFF'} {sender.has_password === false ? '🔴 PASS EMPTY!' : `pass len ${sender.pass_length || 0}`}</div>
                    {sender.has_password === false && <div className={s.passWarn}>❌ Password EMPTY! Edit → Enter SMTP password → Save</div>}
                  </div>
                  <div className={s.inboxBadges}>
                    <span className={sender.auto_paused ? s.statusPaused : sender.status === 'active' ? s.statusActive : s.statusPaused}>{sender.auto_paused ? '⏸ AUTO-PAUSED' : sender.status}</span>
                    {sender.api_linked && <span title="Hostinger Mail API se send hoti hai - no SSL issues" className={s.apiBadge}>🔌 API</span>}
                  </div>
                </div>
                <div className={s.pills}>
                  <span className={`${s.pill} ${isFull ? s.pillWarn : s.pillGood}`}>{sender.sent_today}/{sender.daily_limit} today</span>
                  <span className={s.pill}>{sender.sent_last_hour}/{sender.hourly_limit} hr</span>
                  <span className={`${s.pill} ${sender.remaining_today > 0 ? s.pillGood : s.pillDanger}`}>{sender.remaining_today} left</span>
                  {(sender.bounces_last_hour || 0) > 0 && <span className={s.pill} style={{ background: sender.bounces_last_hour >= 3 ? '#fee2e2' : '#fef3c7', color: sender.bounces_last_hour >= 3 ? '#991b1b' : '#92400e' }}>⚠️ {sender.bounces_last_hour} bounce{sender.bounces_last_hour > 1 ? 's' : ''}/1hr</span>}
                </div>
                <div className={s.progress}><div className={s.progressBar} style={{ width: `${pct}%` }} /></div>

                <div className={s.customBox}>
                  <div className={s.customTitle}>⚙️ CUSTOM LIMITS — Set Any Number (1-1000)</div>
                  <div className={s.customGrid}>
                    <div>
                      <label className={s.miniLabel}>Daily Limit</label>
                      <input type="number" min="1" max="1000" placeholder={sender.daily_limit} value={custom.daily_limit ?? ''} onChange={e => updateCustomLimitInline(sender.id, 'daily_limit', e.target.value)} className={s.customInput} />
                      <div className={s.miniNote}>Current: {sender.daily_limit}/day</div>
                    </div>
                    <div>
                      <label className={s.miniLabel}>Hourly Limit</label>
                      <input type="number" min="1" max="200" placeholder={sender.hourly_limit} value={custom.hourly_limit ?? ''} onChange={e => updateCustomLimitInline(sender.id, 'hourly_limit', e.target.value)} className={s.customInput} />
                      <div className={s.miniNote}>Current: {sender.hourly_limit}/hr</div>
                    </div>
                    <button onClick={() => saveCustomLimit(sender.id)} disabled={!custom.daily_limit && !custom.hourly_limit} className={custom.daily_limit || custom.hourly_limit ? s.saveBtnOn : s.saveBtnOff}>💾 Save</button>
                  </div>
                  <div className={s.quickRow}>
                    <span className={s.miniNote}>Quick:</span>
                    {[10, 25, 30, 50, 75, 100, 150, 200].map(v => <button key={v} onClick={() => updateLimit(sender.id, 'daily_limit', v)} className={s.quickBtn}>{v}/d</button>)}
                  </div>
                  <div className={s.quickRow}>
                    <span className={s.miniNote}>Hourly:</span>
                    {[5, 8, 10, 15, 20, 30, 50].map(v => <button key={v} onClick={() => updateLimit(sender.id, 'hourly_limit', v)} className={s.quickBtn}>{v}/h</button>)}
                  </div>
                </div>

                {sender.auto_paused && <div className={s.pauseNote}>⏸ 1 ghante me {sender.bounces_last_hour || 3}+ bounces — domain protection ke liye auto-paused. Password fix karo ya Resume dabao.</div>}
                <div className={s.actions}>
                  {sender.auto_paused && <button onClick={() => resumeSender(sender.id)} className={s.btnResume}>▶️ Resume</button>}
                  <button onClick={() => startEdit(sender)} className={s.btnSmall}>✏️ Edit Full</button>
                  <button onClick={() => testSender(sender.id)} className={s.btnSmall}>Test SMTP</button>
                  <button onClick={() => deleteSender(sender.id)} className={`${s.btnSmall} ${s.btnDanger}`}>Delete</button>
                </div>
              </div>
            )
          })}
          {senders.length === 0 && <div className={s.emptyGrid}>No senders yet. Add below with custom limits.</div>}
        </div>
      </div>

      <div className={s.card}>
        <div className={s.hgHead}>
          <div>
            <div className={s.title}>🔌 Hostinger Mail API — Advanced Tracking + API Send</div>
            <div className={s.hgSub}>Replies auto-track • Bounce auto-pause (domain protection) • Send via API (SSL ki problem khatam)</div>
          </div>
          <div className={s.hgBadges}>
            <span className={hgSettings?.has_key ? s.keyOn : s.keyOff}>{hgSettings?.has_key ? `✅ Key ${hgSettings.key_tail}` : '⚪ No API key yet'}</span>
            <span className={hgSettings?.has_webhook_secret ? s.keyOn : s.keyWarn}>{hgSettings?.has_webhook_secret ? '🔒 Webhook verified' : 'Webhook open (no verify)'}</span>
          </div>
        </div>

        <form onSubmit={saveHg} className={s.hgForm}>
          <div className={s.hgGrid}>
            <div><label className={s.label}>Hostinger API Key {hgSettings?.has_key ? `(current ${hgSettings.key_tail})` : ''}</label><input className={s.input} type="password" placeholder="Panel → Developers → API keys → paste here" value={hgKey} onChange={e => setHgKey(e.target.value)} /></div>
            <div><label className={s.label}>Send Via</label>
              <select className={s.select} value={hgVia} onChange={e => setHgVia(e.target.value)}>
                <option value="auto">Auto — API if linked, else SMTP ✅</option>
                <option value="smtp">SMTP Only</option>
                <option value="api">API Only</option>
              </select>
            </div>
            <div><label className={s.label}>Public Base URL (for webhooks)</label><input className={s.input} placeholder="https://orvexify.com" value={hgPub} onChange={e => setHgPub(e.target.value)} /></div>
            <div><label className={s.label}>Webhook Secret (optional, for verify)</label><input className={s.input} type="password" placeholder="Paste webhook secret if you want verification" value={hgSecret} onChange={e => setHgSecret(e.target.value)} /></div>
          </div>
          <div className={s.hgBtns}>
            <button type="submit" className={s.btnPrimary}>💾 Save Hostinger Settings</button>
            <button type="button" onClick={testHg} className={s.hgBtnOutline}>🔍 Test API + Auto-Link Senders</button>
            <button type="button" onClick={setupWebhook} className={s.hgBtnSolid}>⚡ 1-Click Webhook Setup</button>
          </div>
          {hgSettings?.webhook_url && (
            <div className={s.hgWebhookUrl}>
              📡 <b>Webhook URL:</b> <code>{hgSettings.webhook_url}</code>
              <span className={s.hgWebhookNote}> — 1-Click Setup se har mailbox pe ye webhook auto-banega. Reply aate hi dashboard me dikhega.</span>
            </div>
          )}
          {hgMsg && <div className={hgMsg.type === 'ok' ? s.hgMsgOk : hgMsg.type === 'err' ? s.hgMsgErr : s.hgMsgBusy}>{hgMsg.text}</div>}
        </form>

        <div className={s.hgSteps}>
          <div className={s.hgStep}><b>1️⃣ API Key</b><br />Panel → Developers → API keys → Create token (selected mailboxes) → paste → Save. Sender emails auto-link ho jayenge (🔌 API badge).</div>
          <div className={s.hgStep}><b>2️⃣ Webhook</b><br />"1-Click Webhook Setup" → saare mailboxes pe webhook. Reply = lead replied, bounce = bounced.</div>
          <div className={s.hgStep}><b>3️⃣ Auto-Pause</b><br />Koi sender {hgSettings?.bounce_pause_threshold || 3}+ bounces/ghanta de to auto-pause (domain protect). Resume button se wapas.</div>
        </div>
        <div className={s.hgFoot}>ℹ️ Hostinger abhi <code>message.received</code> event deta hai (replies). Bounce/delivery events future me add honge — system ready hai (auto-pause abhi SMTP bounces se bhi kaam karta hai).</div>
      </div>

      <div className={s.cardGreen}>
        <div className={s.cardGreenTitle}>✅ CUSTOM LIMITS — Ab Jitni Chaho Set Karo!</div>
        <div className={s.cardGreenBody}>
          • <b>Daily Limit:</b> 1 se 1000 tak koi bhi number — 10, 25, 30, 50, 100, 200, 500 etc<br />
          • <b>Hourly Limit:</b> 1 se 200 tak — 5, 8, 10, 15, 20, 30, 50 etc<br />
          • <b>Per Sender:</b> Har sender ki alag limit — 1st sender 30/day, 2nd 50/day, 3rd 100/day aise<br />
          • <b>Inline Edit:</b> Card me direct number type karo + Save dabao — instant update<br />
          • <b>Bulk Add:</b> Format: <code>email,password,From Name,daily,hourly</code> — Example: <code>info@orvexify.com,pass123,Sales,75,25</code><br />
          • Total capacity auto-calculate: {senders.length} senders × avg limit = {totalCap}/day
        </div>
      </div>

      <div className={s.cardRed}>
        <div className={s.cardRedTitle}>🔧 SSL Error Fix — wrong version number</div>
        <div className={s.cardRedBody}>
          Error <code>wrong version number</code> = port/secure mismatch.<br />
          <b>Solution (auto-fixed now):</b><br />
          • <b>Hostinger:</b> smtp.hostinger.com port <b>587</b> secure <b>OFF</b> ✅ Recommended<br />
          • <b>Gmail:</b> smtp.gmail.com port <b>587</b> secure <b>OFF</b> + App Password<br />
          • <b>Zoho:</b> smtp.zoho.com port <b>587</b> secure <b>OFF</b> ya 465 ON<br />
          • System ab auto-fix karta hai: 465 → secure ON, 587 → secure OFF. Test SMTP dabao to verify.
        </div>
      </div>

      <div className={s.card}>
        <div className={s.formHead}>
          <div className={s.title}>{editingId ? '✏️ Edit Sender — CUSTOM LIMITS' : '➕ Add Sender — Custom Limits (Any Number)'}</div>
          {editingId && <button onClick={cancelEdit} className={s.cancelBtn}>Cancel</button>}
        </div>
        <div className={s.formGrid}>
          <div>
            <label className={s.label}>Bulk Add: email,password,From Name,daily,hourly (custom)</label>
            <textarea className={s.input} style={{ minHeight: 140, fontFamily: 'monospace', fontSize: 11 }}
              placeholder={'info@orvexify.com,pass123,Orvexify Sales,50,20\nsales@orvexify.com,pass456,Sales Team,75,25\nsupport@orvexify.com,pass789,Support,100,30\n# Format: email,password,Name,daily_limit,hourly_limit\n# daily 1-1000, hourly 1-200 - jitna chaho!'} value={bulk} onChange={e => setBulk(e.target.value)} />
            <button onClick={bulkAdd} className={s.btnPrimary} style={{ marginTop: 8 }}>➕ Add {bulk.split('\n').filter(l => l.trim()).length || 3} Senders with Custom Limits ({form.daily_limit}/d {form.hourly_limit}/h)</button>
            <div className={s.presetRow}>
              <button onClick={() => handleHostPreset('smtp.hostinger.com')} className={s.presetBtn}>Hostinger 587 OFF ✅</button>
              <button onClick={() => handleHostPreset('smtp.gmail.com')} className={s.presetBtn}>Gmail 587 OFF</button>
              <button onClick={() => handleHostPreset('smtp.zoho.com')} className={s.presetBtn}>Zoho 587 OFF</button>
              <button onClick={() => handleHostPreset('smtp.office365.com')} className={s.presetBtn}>Outlook 587 OFF</button>
            </div>
            <div className={s.bulkDefaults}>
              <div className={s.miniLabel}>Current Bulk Defaults (Custom):</div>
              <div className={s.bulkDefaultGrid}>
                <div><label className={s.miniLabel}>Daily Default</label><input type="number" min="1" max="1000" value={form.daily_limit} onChange={e => setForm({ ...form, daily_limit: parseInt(e.target.value) || 50 })} className={s.defaultInput} /></div>
                <div><label className={s.miniLabel}>Hourly Default</label><input type="number" min="1" max="200" value={form.hourly_limit} onChange={e => setForm({ ...form, hourly_limit: parseInt(e.target.value) || 20 })} className={s.defaultInput} /></div>
              </div>
              <div className={s.miniNote}>Bulk add me ye defaults use honge agar line me daily/hourly nahi diya. Har line me custom bhi de sakte ho: email,pass,Name,75,25</div>
            </div>
          </div>
          <div>
            <form onSubmit={handleSubmit} className={s.formCol}>
              <div className={s.formRow2}>
                <div><label className={s.label}>From Name *</label><input className={s.input} placeholder="Orvexify Sales" value={form.from_name} onChange={e => setForm({ ...form, from_name: e.target.value })} required /></div>
                <div><label className={s.label}>Email (SMTP User) *</label><input className={s.input} type="email" placeholder="info@orvexify.com" value={form.smtp_user} onChange={e => setForm({ ...form, smtp_user: e.target.value })} required /></div>
              </div>

              <div className={s.customPanel}>
                <div className={s.customPanelTitle}>⚙️ CUSTOM LIMITS — Jitna Chaho Set Karo (1-1000)</div>
                <div className={s.formRow2}>
                  <div>
                    <label className={s.label}>Daily Limit (1-1000) *</label>
                    <input className={s.input} type="number" min="1" max="1000" value={form.daily_limit} onChange={e => setForm({ ...form, daily_limit: parseInt(e.target.value) || 1 })} required />
                    <div className={s.quickRow}>
                      {[10, 25, 30, 50, 75, 100, 150, 200, 500].map(v => <button key={v} type="button" onClick={() => setForm({ ...form, daily_limit: v })} className={form.daily_limit === v ? s.quickBtnOn : s.quickBtn}>{v}/d</button>)}
                    </div>
                  </div>
                  <div>
                    <label className={s.label}>Hourly Limit (1-200) *</label>
                    <input className={s.input} type="number" min="1" max="200" value={form.hourly_limit} onChange={e => setForm({ ...form, hourly_limit: parseInt(e.target.value) || 1 })} required />
                    <div className={s.quickRow}>
                      {[5, 8, 10, 15, 20, 30, 50, 100].map(v => <button key={v} type="button" onClick={() => setForm({ ...form, hourly_limit: v })} className={form.hourly_limit === v ? s.quickBtnOn : s.quickBtn}>{v}/h</button>)}
                    </div>
                  </div>
                </div>
                <div className={s.customExample}>Example: 1st sender 30/day 8/hr, 2nd sender 50/day 20/hr, 3rd sender 100/day 30/hr — har ek ki alag! Total = {form.daily_limit} × senders = custom capacity. 150/day ke liye 3 senders × 50/day.</div>
              </div>

              <div><label className={s.label}>SMTP Host *</label>
                <div className={s.hostRow}>
                  <input className={s.input} style={{ flex: 1 }} placeholder="smtp.hostinger.com" value={form.smtp_host} onChange={e => handleHostPreset(e.target.value)} required />
                  <button type="button" onClick={() => handleHostPreset(form.smtp_host)} className={s.presetBtn}>Auto Port</button>
                </div>
              </div>
              <div className={s.formRow2}>
                <div><label className={s.label}>SMTP Port *</label>
                  <select className={s.select} value={form.smtp_port} onChange={e => handlePortChange(e.target.value)}>
                    <option value={587}>587 — STARTTLS (Hostinger/Gmail/Zoho) ✅ Recommended</option>
                    <option value={465}>465 — SSL (implicit)</option>
                    <option value={25}>25 — Plain</option>
                    <option value={2525}>2525 — Alternative</option>
                  </select>
                  <div className={s.portNote} style={{ color: sslMismatch ? '#ef4444' : '#6b7280' }}>
                    {form.smtp_port === 465 ? 'Port 465 → secure ON (auto)' : 'Port 587 → secure OFF (auto) — fixes wrong version number'}
                  </div>
                </div>
                <div><label className={s.label}>App Password * {editingId && '(blank to keep old)'}</label><input className={s.input} type="password" placeholder="••••••••" value={form.smtp_pass} onChange={e => setForm({ ...form, smtp_pass: e.target.value })} required={!editingId} /></div>
              </div>
              <div className={s.autoNote}>
                Auto: Port 465 = secure true, Port 587/25/2525 = secure false. Current: <b>{form.smtp_host}:{form.smtp_port} secure {form.smtp_secure ? 'ON' : 'OFF'}</b> | Daily {form.daily_limit}/day Hourly {form.hourly_limit}/hr — CUSTOM
              </div>
              <button type="submit" disabled={loading} className={s.btnPrimary}>{loading ? 'Saving...' : editingId ? `✏️ Update Sender — ${form.daily_limit}/d ${form.hourly_limit}/h` : `➕ Add Sender — ${form.daily_limit}/day ${form.hourly_limit}/hr Custom`}</button>
              <div className={s.miniNote}>Custom limits: Daily 1-1000, Hourly 1-200. Example: 3 senders × 50/day = 150/day total. Hostinger: smtp.hostinger.com 587 OFF.</div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
