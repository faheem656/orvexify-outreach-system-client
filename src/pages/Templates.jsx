import React, { useState, useEffect } from 'react'
import s from './Templates.module.css'
import { apiUrl } from '../config.js'
import { useApp } from '../context/AppContext.jsx'
import { EYE_CATCHY_TEMPLATES } from '../components/EmailTemplates.js'

const defaultForm = (senders = []) => ({
  name: EYE_CATCHY_TEMPLATES[0].name,
  sender_ids: senders.map(x => x.id),
  subject: EYE_CATCHY_TEMPLATES[0].subject,
  body: EYE_CATCHY_TEMPLATES[0].body,
  followup1_condition: 'not_opened', followup1_delay: 3, followup1_subject: EYE_CATCHY_TEMPLATES[0].followup1_subject, followup1_body: EYE_CATCHY_TEMPLATES[0].followup1_body,
  followup2_condition: 'opened_no_click', followup2_delay: 5, followup2_subject: 'How clinics save $4k/mo on no-shows', followup2_body: `Hi {{first_name}},\n\nSince you opened my last note - quick value:\n\nAvg US clinic: 30 no-shows/month x $150 = $4500 lost.\n\nOrvexify automates reminders + lets patients reschedule via link.\n\nWant the 2-min demo?\n\nReply NO if not relevant.`,
  followup3_condition: 'not_clicked', followup3_delay: 7, followup3_subject: 'Closing the loop - {{company_name}}', followup3_body: `{{first_name}}, looks like not a priority.\n\nI'll stop reaching out. If you ever want to cut no-shows at {{company_name}}, just reply YES.\n\nBest,\n{{from_name}}`,
})

const sampleLead = { first_name: 'Faheem', last_name: 'Ejaz', title: 'CEO', company_name: 'Miami Family Clinic', email: 'faheeme4162913@gmail.com', from_name: 'Sarah - Orvexify', country: 'United States', country_code: 'US', timezone: 'America/New_York' }

function renderPreview(tpl, lead, stripHtml = false) {
  if (!tpl) return ''
  let out = tpl
  out = out.replace(/\{([^{}]*\|[^{}]*)\}/g, (m, inner) => {
    const opts = inner.split('|').map(x => x.trim()).filter(Boolean)
    if (!opts.length) return ''
    return opts[Math.floor(Math.random() * opts.length)]
  })
  const vars = {
    first_name: lead.first_name, last_name: lead.last_name, title: lead.title,
    company_name: lead.company_name, clinic_name: lead.company_name,
    email: lead.email, from_name: lead.from_name || 'Orvexify',
    country: lead.country || 'United States', country_code: lead.country_code || 'US',
    timezone: lead.timezone || 'America/New_York',
    unsubscribe_link: '#unsubscribe', resubscribe_link: '#resubscribe',
    'First Name': lead.first_name, 'Last Name': lead.last_name, 'Title': lead.title,
    'Company Name': lead.company_name, 'Company': lead.company_name, 'Clinic Name': lead.company_name,
    'Email': lead.email, 'Country': lead.country || 'United States',
  }
  const getVal = (k) => {
    const key = k.trim()
    if (vars[key] !== undefined) return vars[key]
    const lk = key.toLowerCase()
    const found = Object.keys(vars).find(x => x.toLowerCase() === lk)
    if (found) return vars[found]
    const norm = lk.replace(/[\s_\-]/g, '')
    const found2 = Object.keys(vars).find(x => x.toLowerCase().replace(/[\s_\-]/g, '') === norm)
    return found2 ? vars[found2] : ''
  }
  out = out.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (m, k) => getVal(k))
  out = out.replace(/\{\s*([A-Za-z0-9_\- ]+?)\s*\}/g, (m, k) => { if (k.includes('|')) return m; return getVal(k) })
  if (stripHtml) out = out.replace(/<[^>]*>/g, '')
  out = out.replace(/\s{2,}/g, ' ')
  return out
}
const isHtmlTemplate = (body) => {
  if (!body) return false
  const lower = body.toLowerCase()
  return lower.includes('<!doctype') || lower.includes('<html') || lower.includes('<table') || lower.includes('<div style')
}

export default function Templates() {
  const { templates, refreshTemplates } = useApp()
  const [senders, setSenders] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)
  const [previewMode, setPreviewMode] = useState('html')
  const [form, setForm] = useState(() => defaultForm([]))

  useEffect(() => {
    fetch(apiUrl('/api/senders')).then(r => r.text()).then(text => {
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) return
      try {
        const data = JSON.parse(text)
        setSenders(Array.isArray(data) ? data : [])
      } catch { /* ignore */ }
    }).catch(() => { })
  }, [])

  useEffect(() => {
    if (selected && selected.id !== editingId) {
      setForm({
        name: selected.name || '',
        sender_ids: selected.sender_ids ? JSON.parse(selected.sender_ids) : [],
        subject: selected.subject || '',
        body: selected.body || '',
        followup1_condition: selected.followup1_condition || 'any', followup1_delay: selected.followup1_delay || 3, followup1_subject: selected.followup1_subject || '', followup1_body: selected.followup1_body || '',
        followup2_condition: selected.followup2_condition || 'any', followup2_delay: selected.followup2_delay || 5, followup2_subject: selected.followup2_subject || '', followup2_body: selected.followup2_body || '',
        followup3_condition: selected.followup3_condition || 'any', followup3_delay: selected.followup3_delay || 7, followup3_subject: selected.followup3_subject || '', followup3_body: selected.followup3_body || '',
      })
      setEditingId(selected.id)
    }
  }, [selected, editingId])

  const toggleSender = (id) => setForm(f => ({ ...f, sender_ids: f.sender_ids.includes(id) ? f.sender_ids.filter(i => i !== id) : [...f.sender_ids, id] }))

  const applyPreset = (preset) => setForm(f => ({ ...f, name: preset.name, subject: preset.subject, body: preset.body, followup1_subject: preset.followup1_subject, followup1_body: preset.followup1_body }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.sender_ids.length === 0) return alert('Select at least 1 sender. For 150/day, select 3 senders with 50/day each.')
    try {
      const url = editingId ? apiUrl(`/api/templates/${editingId}`) : apiUrl('/api/templates')
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const text = await res.text()
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) return alert('❌ Server not running!')
      const data = JSON.parse(text)
      if (data.id || data.ok) {
        const totalCap = senders.filter(x => form.sender_ids.includes(x.id)).reduce((sum, x) => sum + x.daily_limit, 0)
        alert(editingId ? `✅ Template updated! ${totalCap}/day` : `✅ Template created! ${form.sender_ids.length} senders = ${totalCap}/day`)
        setEditingId(null); setSelected(null)
        refreshTemplates()
      }
    } catch (err) { alert('❌ ' + err.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this template and all its leads?')) return
    await fetch(apiUrl(`/api/templates/${id}`), { method: 'DELETE' })
    if (editingId === id) { setEditingId(null); setSelected(null); setDebugInfo(null) }
    refreshTemplates()
  }

  const handleTest = async (id) => {
    const email = prompt('Enter test email:')
    if (!email || !email.includes('@')) return
    const data = await fetch(apiUrl(`/api/templates/${id}/test`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ test_email: email }) }).then(r => r.json()).catch(() => ({ ok: false, error: 'Network' }))
    alert(data.ok ? `✅ ${data.message}` : `❌ ${data.error}\n${data.hint || 'Check SMTP host/user/pass in Senders page. For Gmail use App Password'}`)
  }

  const handleDebug = async (id) => {
    const data = await fetch(apiUrl(`/api/templates/${id}/debug`)).then(r => r.json()).catch(() => null)
    if (!data) return
    setDebugInfo(data)
    console.log('DEBUG', data)
    const hints = data.fixHints?.join('\n') || 'No hints'
    alert(`🔍 DEBUG for ${data.templateName}\n\nTotal: ${data.counts.totalLeads}\nPending: ${data.counts.pendingLeads}\nReady: ${data.counts.readyLeads}\nSenders: ${data.senders.length}\nBest: ${data.bestSender?.smtp_user || 'NONE - all limited!'}\n\nFix:\n${hints}\n\nFull JSON in console + below panel`)
  }

  const handleSendNow = async (id) => {
    if (!confirm('Force send 50 leads NOW ignoring time window?')) return
    setDebugInfo(null)
    const data = await fetch(apiUrl(`/api/templates/${id}/send-now`), { method: 'POST' }).then(r => r.json())
    console.log('SEND NOW result', data)
    if (data.sent > 0) {
      alert(`✅ Sent ${data.sent} emails NOW!\n${data.message}`)
      refreshTemplates()
    } else {
      const debugData = await fetch(apiUrl(`/api/templates/${id}/debug`)).then(r => r.json())
      setDebugInfo(debugData)
      alert(`⚠️ Sent 0\n\n${data.message}\n\nReason: ${data.reason}\nTotal: ${data.totalLeads} Pending: ${data.pending} Ready: ${data.ready}\nSenders: ${debugData.senders?.map(x => `${x.smtp_user} ${x.sent_today}/${x.daily_limit} rem ${x.remaining}`).join(', ')}\n\nFix Hints:\n${debugData.fixHints?.join('\n')}\n\nSee debug panel below for full details`)
    }
  }

  const handleReset = async (id) => {
    if (!confirm('Reset all leads to pending? (for testing)')) return
    const data = await fetch(apiUrl(`/api/templates/${id}/leads/reset`), { method: 'POST' }).then(r => r.json())
    alert(`✅ Reset ${data.updated || ''} leads to pending - now ready to send`)
    refreshTemplates()
  }

  const handleNew = () => {
    setEditingId(null); setSelected(null); setDebugInfo(null)
    setForm(defaultForm(senders))
  }

  const handleSeedFancy = async () => {
    if (!confirm('Create 2 eye-catchy HTML templates in DB with current senders? (No address)')) return
    try {
      const data = await fetch(apiUrl('/api/templates/seed-fancy'), { method: 'POST' }).then(r => r.json())
      if (data.ok) { alert(`✅ ${data.message}\nCreated: ${data.count} templates - now test them!`); refreshTemplates() }
      else alert('❌ ' + (data.error || 'Failed'))
    } catch (e) { alert('❌ ' + e.message) }
  }

  const totalCap = senders.filter(x => form.sender_ids.includes(x.id)).reduce((sum, x) => sum + x.daily_limit, 0)
  const previewIsHtml = isHtmlTemplate(form.body)

  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <div className={s.title}>🎨 Eye-Catchy Templates — No Address ✅ (CSS Added)</div>
        <div className={s.sub}>Plain 1-line text = no one reads. These HTML templates with inline CSS have 3x more clicks. Address removed everywhere as requested. Pick one → Customize → Test.</div>
        <div className={s.presetGrid}>
          {EYE_CATCHY_TEMPLATES.map(preset => (
            <div key={preset.id} onClick={() => applyPreset(preset)} className={s.presetCard}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#4f46e5'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}>
              <div className={s.presetName}>{preset.name}</div>
              <div className={s.presetSub}>{preset.subject.substring(0, 60)}...</div>
              <div className={s.presetUse}>Use This →</div>
            </div>
          ))}
        </div>
        <div className={s.seedRow}>
          <button onClick={handleSeedFancy} className={s.seedBtn}>🚀 Auto-Create 2 Fancy HTML Templates in DB (No Address)</button>
          <span className={s.seedNote}>Click to instantly create HTML templates in database, then Test Email will be HTML!</span>
        </div>
        <div className={s.seedInfo}>
          <b>💡 Why still plain text in test?</b> Because your OLD template in DB is still plain text! You must either: 1) Click "Use This →" on a preset above, then click "Create Template" button below, OR 2) Click "Auto-Create 2 Fancy HTML Templates" button. Then test the NEW template — it will be HTML eye-catchy. Old template will always be plain.
          <br /><br />Our templates use <b>no Orvexify LLC address</b> as requested, only Unsubscribe/Resubscribe links. HTML with clean inline CSS + table layout = still inbox if you keep spam words low.
        </div>
      </div>

      <div className={s.card}>
        <div className={s.formHead}>
          <div>
            <div className={s.title}>✉️ Templates — NO ADDRESS ✅ — Eye-Catchy CSS</div>
            <div className={s.sub}>Vars: {'{{first_name}}'} {'{{company_name}}'} {'{{country}}'} {'{{timezone}}'} + Spintax {'{Hi|Hello}'}. Address removed from all footers as requested. {editingId ? 'Editing' : 'New'} • Total {totalCap}/day</div>
          </div>
          <button onClick={handleNew} className={s.newBtn}>+ New Template</button>
        </div>

        <form onSubmit={handleSubmit} className={s.form}>
          <div className={s.grid2}>
            <div><label className={s.label}>Template Name {editingId ? '(Editing)' : '(New)'}</label><input className={s.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div><label className={s.label}>Total Daily: {totalCap}/day from {form.sender_ids.length} senders</label>
              <div className={totalCap >= 150 ? s.capOk : s.capBox}>{totalCap}/day = {form.sender_ids.length} senders × {form.sender_ids.length ? Math.round(totalCap / form.sender_ids.length) : 30}/day • No address ✅</div>
            </div>
          </div>

          <div>
            <label className={s.label}>Select Senders</label>
            <div className={s.inboxSelector}>
              {senders.map(sdr => {
                const sel = form.sender_ids.includes(sdr.id)
                return (
                  <div key={sdr.id} className={sel ? s.inboxOptionSel : s.inboxOption} onClick={() => toggleSender(sdr.id)}>
                    <div className={sel ? s.checkSel : s.check}>{sel ? '✓' : ''}</div>
                    <div className={s.optBody}><div className={s.optName}>{sdr.from_name} — {sdr.smtp_user}</div><div className={s.optMeta}>{sdr.daily_limit}/day • {sdr.sent_today} sent • {sdr.remaining_today} left {sdr.remaining_today === 0 ? '⚠️ LIMIT HIT' : ''}</div></div>
                    <div className={sel ? s.optBadgeOn : s.optBadgeOff}>{sdr.daily_limit}/day</div>
                  </div>
                )
              })}
              {senders.length === 0 && <div className={s.emptyOpt}>No senders. Add in Senders page first.</div>}
            </div>
          </div>

          <div className={s.initialBox}>
            <div className={s.initialHead}>
              <div className={s.initialTitle}>📧 Initial Email (Day 0) — {previewIsHtml ? '🎨 HTML (Eye-Catchy CSS)' : '✉️ Plain Text'}</div>
              <div className={s.previewBtns}>
                <button type="button" onClick={() => setPreviewMode('html')} className={previewMode === 'html' ? s.previewBtnOn : s.previewBtn}>HTML Preview</button>
                <button type="button" onClick={() => setPreviewMode('text')} className={previewMode === 'text' ? s.previewBtnOn : s.previewBtn}>Text Preview</button>
              </div>
            </div>
            <div className={s.initialCol}>
              <div><label className={s.label}>Subject — Preview: {renderPreview(form.subject, sampleLead, true)}</label><input className={s.input} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
              <div><label className={s.label}>Body — HTML with inline CSS supported! (Address auto-removed)</label><textarea className={s.textarea} style={{ minHeight: 200, fontFamily: previewIsHtml ? 'monospace' : 'inherit', fontSize: previewIsHtml ? '11px' : '13px' }} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /></div>

              <div className={s.previewBox}>
                <div className={s.previewHead}>
                  <div className={s.previewTitle}>👁️ Live Preview — Sample: {sampleLead.first_name} {sampleLead.last_name} / {sampleLead.company_name} • No Address ✅</div>
                  <div className={s.previewMode}>{previewIsHtml ? 'HTML Rendered' : 'Text Mode'}</div>
                </div>
                <div className={previewMode === 'html' && previewIsHtml ? s.previewBody : s.previewBodyPad}>
                  {previewMode === 'html' && previewIsHtml ? (
                    <div className={s.previewHtmlScroll}><div dangerouslySetInnerHTML={{ __html: renderPreview(form.body, sampleLead, false) }} /></div>
                  ) : (
                    <>
                      <div className={s.previewSubject}><b>Subject:</b> {renderPreview(form.subject, sampleLead, true)}</div>
                      <div className={s.previewText}>{renderPreview(form.body, sampleLead, true)}</div>
                    </>
                  )}
                </div>
                <div className={s.previewFoot}>Vars: {'{first_name}'} → Faheem, {'{company_name}'} → Miami Family Clinic, {'{country}'} → United States, {'{timezone}'} → America/New_York. Spintax {'{Hi|Hello|Hey}'}. Footer: Only Unsubscribe/Resubscribe — NO physical address as requested.</div>
              </div>
            </div>
          </div>

          {[
            { key: 'followup1', title: 'Follow-up 1', desc: 'Not opened → bump' },
            { key: 'followup2', title: 'Follow-up 2', desc: 'Opened no click → case study' },
            { key: 'followup3', title: 'Follow-up 3', desc: 'Not clicked → break-up' },
          ].map(f => (
            <div key={f.key} className={s.step}>
              <div className={s.stepHead}>
                <div className={s.stepTitle}>{f.title} <span className={s.stepBadge}>{f.desc}</span></div>
                <div className={s.conditionRow}>
                  <span className={s.condLabel}>IF</span>
                  <select className={s.condSelect} value={form[`${f.key}_condition`]} onChange={e => setForm({ ...form, [`${f.key}_condition`]: e.target.value })}>
                    <option value="any">Any</option><option value="not_opened">Not Opened</option><option value="opened">Opened</option><option value="opened_no_click">Opened No Click</option><option value="clicked">Clicked</option><option value="not_clicked">Not Clicked</option>
                  </select>
                  <span className={s.condLabel}>AFTER</span>
                  <select className={s.condSelectSm} value={form[`${f.key}_delay`]} onChange={e => setForm({ ...form, [`${f.key}_delay`]: parseInt(e.target.value) })}>
                    <option value={1}>1 day</option><option value={2}>2 days</option><option value={3}>3 days</option><option value={5}>5 days</option><option value={7}>7 days</option>
                  </select>
                </div>
              </div>
              <div className={s.stepCol}>
                <input className={s.input} placeholder="Subject" value={form[`${f.key}_subject`]} onChange={e => setForm({ ...form, [`${f.key}_subject`]: e.target.value })} />
                <textarea className={s.textarea} placeholder="Body" value={form[`${f.key}_body`]} onChange={e => setForm({ ...form, [`${f.key}_body`]: e.target.value })} />
              </div>
            </div>
          ))}

          <button type="submit" className={s.submitBtn}>{editingId ? '✏️ Update Template (No Address)' : 'Create Template — Eye Catchy + No Address ✅'}</button>
        </form>
      </div>

      {debugInfo && (
        <div className={s.debugCard}>
          <div className={s.debugTitle}>🔍 Debug: {debugInfo.templateName} ({debugInfo.templateId})</div>
          <div className={s.debugGrid}>
            <div className={s.debugTile}><div className={s.debugTileLabel}>Total Leads</div><div className={s.debugTileValue}>{debugInfo.counts.totalLeads}</div></div>
            <div className={s.debugTile}><div className={s.debugTileLabel}>Pending</div><div className={s.debugTileValue} style={{ color: '#d97706' }}>{debugInfo.counts.pendingLeads}</div></div>
            <div className={s.debugTile}><div className={s.debugTileLabel}>Ready to Send</div><div className={s.debugTileValue} style={{ color: debugInfo.counts.readyLeads === 0 ? '#ef4444' : '#059669' }}>{debugInfo.counts.readyLeads}</div></div>
            <div className={s.debugTile}><div className={s.debugTileLabel}>Senders</div><div className={s.debugTileValue}>{debugInfo.senders.length}</div></div>
          </div>
          <div className={s.debugSection}>
            <div className={s.debugSectionTitle}>Senders Status:</div>
            {debugInfo.senders.map(sd => (
              <div key={sd.id} className={s.debugSender}>
                <span>{sd.from_name} ({sd.smtp_user})</span>
                <span>{sd.sent_today}/{sd.daily_limit} daily rem {sd.remaining} | {sd.hourly}/{sd.hourly_limit} hourly | {sd.status} {sd.remaining === 0 ? '⚠️ LIMIT HIT' : ''}</span>
              </div>
            ))}
          </div>
          <div className={s.debugSection}>
            <div className={s.debugSectionTitle}>Fix Hints:</div>
            <ul className={s.debugHints}>
              {debugInfo.fixHints.map((h, i) => <li key={i}>{h}</li>)}
              {(!debugInfo.fixHints || debugInfo.fixHints.length === 0) && <li>All good! Try Send Now again, or check SMTP logs in server console for actual send error (like Invalid login)</li>}
            </ul>
          </div>
          <div className={s.debugSection}>
            <div className={s.debugSectionTitle}>Sample Leads:</div>
            <pre className={s.debugPre}>{JSON.stringify(debugInfo.sampleLeads, null, 2)}</pre>
          </div>
          <div className={s.debugSection}>
            <div className={s.debugSectionTitle}>Sender Selection Debug:</div>
            <pre className={s.debugPre}>{debugInfo.senderSelectionDebug?.join('\n')}</pre>
          </div>
          <button onClick={() => setDebugInfo(null)} className={s.closeBtn}>Close Debug</button>
        </div>
      )}

      <div className={s.card}>
        <div className={s.existingTitle}>Existing Templates — {templates.length} • No Address ✅</div>
        <div className={s.existingList}>
          {templates.map(t => (
            <div key={t.id} className={selected?.id === t.id ? s.existingItemActive : s.existingItem}>
              <div className={s.existingHead} onClick={() => setSelected(t)}>
                <div><div className={s.existingName}>{t.name} {editingId === t.id && '(Editing)'} {t.body?.includes('<html') || t.body?.includes('<table') ? '🎨' : '✉️'}</div>
                  <div className={s.existingMeta}>{t.sender_names?.join(', ') || 'All senders'} • {t.totalDailyCapacity}/day • {t.stats?.total || 0} leads • {t.stats?.pending || 0} queued • {t.stats?.sent || 0} sent • {t.stats?.bounced || 0} bounced</div></div>
                <div className={s.existingDate}>{new Date(t.created_at).toLocaleDateString()}</div>
              </div>
              <div className={s.existingActions}>
                <button onClick={() => setSelected(t)} className={s.xBtn}>✏️ Edit</button>
                <button onClick={() => handleDebug(t.id)} className={s.xBtnYellow}>🔍 Debug Why 0?</button>
                <button onClick={() => handleTest(t.id)} className={s.xBtnBlue}>📤 Test Email</button>
                <button onClick={() => handleSendNow(t.id)} className={s.xBtnGreen}>🚀 Send Now (Force)</button>
                <button onClick={() => handleReset(t.id)} className={s.xBtnYellow}>🔄 Reset Pending</button>
                <button onClick={() => handleDelete(t.id)} className={s.xBtnRed}>🗑️ Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
