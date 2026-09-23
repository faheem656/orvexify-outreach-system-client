import React, { useState, useEffect } from 'react'
import s from './CampaignBuilder.module.css'
import { apiUrl } from '../config.js'
import { EYE_CATCHY_TEMPLATES } from './EmailTemplates.js'

export default function TemplatesTab({ templates, onCreated, selected, setSelected }) {
  const [senders, setSenders] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)
  const [previewMode, setPreviewMode] = useState('html') // html | text
  const [form, setForm] = useState({
    name: '',
    sender_ids: [],
    subject: '',
    body: '',
    followup1_condition: 'not_opened', followup1_delay: 3, followup1_subject: '', followup1_body: '',
    followup2_condition: 'opened_no_click', followup2_delay: 5, followup2_subject: '', followup2_body: '',
    followup3_condition: 'not_clicked', followup3_delay: 7, followup3_subject: '', followup3_body: ''
  })

  useEffect(()=>{
    fetch(apiUrl('/api/senders')).then(r=>r.text()).then(text=>{
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) return
      try {
        const data = JSON.parse(text)
        setSenders(Array.isArray(data) ? data : [])
        if (data.length && form.sender_ids.length===0) setForm(f=>({...f, sender_ids: data.map(s=>s.id)}))
      } catch {}
    }).catch(()=>{})
  }, [])

  useEffect(()=>{
    if (selected && selected.id !== editingId) {
      setForm({
        name: selected.name || '',
        sender_ids: selected.sender_ids ? JSON.parse(selected.sender_ids) : [],
        subject: selected.subject || '',
        body: selected.body || '',
        followup1_condition: selected.followup1_condition || 'any',
        followup1_delay: selected.followup1_delay || 3,
        followup1_subject: selected.followup1_subject || '',
        followup1_body: selected.followup1_body || '',
        followup2_condition: selected.followup2_condition || 'any',
        followup2_delay: selected.followup2_delay || 5,
        followup2_subject: selected.followup2_subject || '',
        followup2_body: selected.followup2_body || '',
        followup3_condition: selected.followup3_condition || 'any',
        followup3_delay: selected.followup3_delay || 7,
        followup3_subject: selected.followup3_subject || '',
        followup3_body: selected.followup3_body || '',
      })
      setEditingId(selected.id)
    }
  }, [selected])

  const toggleSender = (id) => {
    setForm(f=>{
      const exists = f.sender_ids.includes(id)
      return {...f, sender_ids: exists ? f.sender_ids.filter(i=>i!==id) : [...f.sender_ids, id]}
    })
  }

  const applyPreset = (preset) => {
    setForm(f=>({
      ...f,
      name: preset.name || '',
      subject: preset.subject || '',
      body: preset.body || '',
      followup1_subject: preset.followup1_subject || '',
      followup1_body: preset.followup1_body || '',
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.sender_ids.length===0) return alert('Select at least 1 sender.')
    if (!form.name.trim()) return alert('Template name required')
    if (!form.subject.trim()) return alert('Subject required')
    if (!form.body.trim()) return alert('Body required')
    try {
      const url = editingId ? apiUrl(`/api/templates/${editingId}`) : apiUrl('/api/templates')
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
      const text = await res.text()
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
        alert('❌ Server not running!'); return
      }
      const data = JSON.parse(text)
      if (data.id || data.ok) { 
        const totalCap = senders.filter(s=>form.sender_ids.includes(s.id)).reduce((sum,s)=>sum+s.daily_limit,0)
        alert(editingId ? `✅ Template updated! ${totalCap}/day` : `✅ Template created! ${form.sender_ids.length} senders = ${totalCap}/day`); 
        setEditingId(null)
        onCreated() 
      }
    } catch (err) { alert('❌ ' + err.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this template and all its leads?')) return
    await fetch(apiUrl(`/api/templates/${id}`), { method:'DELETE' })
    setEditingId(null); setDebugInfo(null)
    onCreated()
  }

  const handleTest = async (id) => {
    const email = prompt('Enter test email:')
    if (!email || !email.includes('@')) return
    const res = await fetch(apiUrl(`/api/templates/${id}/test`), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ test_email: email }) })
    const data = await res.json()
    alert(data.ok ? `✅ ${data.message}` : `❌ ${data.error}\nCheck SMTP host/user/pass in Tab 2. For Gmail use App Password`)
  }

  const handleDebug = async (id) => {
    const res = await fetch(apiUrl(`/api/templates/${id}/debug`))
    const data = await res.json()
    setDebugInfo(data)
    console.log('DEBUG', data)
    const hints = data.fixHints?.join('\n') || 'No hints'
    alert(`🔍 DEBUG for ${data.templateName}\n\nTotal: ${data.counts.totalLeads}\nPending: ${data.counts.pendingLeads}\nReady: ${data.counts.readyLeads}\nSenders: ${data.senders.length}\nBest: ${data.bestSender?.smtp_user || 'NONE - all limited!'}\n\nFix:\n${hints}\n\nFull JSON in console + below panel`)
  }

  const handleSendNow = async (id) => {
    if (!confirm('Force send 50 leads NOW ignoring time window?')) return
    setDebugInfo(null)
    const res = await fetch(apiUrl(`/api/templates/${id}/send-now`), { method:'POST' })
    const data = await res.json()
    console.log('SEND NOW result', data)
    if (data.sent > 0) {
      alert(`✅ Sent ${data.sent} emails NOW!\n${data.message}`)
      onCreated()
    } else {
      const debugRes = await fetch(apiUrl(`/api/templates/${id}/debug`))
      const debugData = await debugRes.json()
      setDebugInfo(debugData)
      alert(`⚠️ Sent 0\n\n${data.message}\n\nReason: ${data.reason}\nTotal: ${data.totalLeads} Pending: ${data.pending} Ready: ${data.ready}\nSenders: ${debugData.senders?.map(s=>`${s.smtp_user} ${s.sent_today}/${s.daily_limit} rem ${s.remaining}`).join(', ')}\n\nFix Hints:\n${debugData.fixHints?.join('\n')}\n\nSee debug panel below for full details`)
    }
  }

  const handleReset = async (id) => {
    if (!confirm('Reset all leads to pending? (for testing)')) return
    const res = await fetch(apiUrl(`/api/templates/${id}/leads/reset`), { method:'POST' })
    const data = await res.json()
    alert(`✅ Reset ${data.updated||''} leads to pending - now ready to send`)
    onCreated()
  }

  const handleNew = () => {
    setEditingId(null); setDebugInfo(null)
    setForm({
      name: '',
      sender_ids: senders.map(s=>s.id),
      subject: '',
      body: '',
      followup1_condition: 'not_opened', followup1_delay: 3, followup1_subject: '', followup1_body: '',
      followup2_condition: 'opened_no_click', followup2_delay: 5, followup2_subject: '', followup2_body: '',
      followup3_condition: 'not_clicked', followup3_delay: 7, followup3_subject: '', followup3_body: ''
    })
  }

  const handleSeedFancy = async () => {
    if (!confirm('Create 2 eye-catchy HTML templates in DB with current senders? (No address)')) return
    try {
      const res = await fetch(apiUrl('/api/templates/seed-fancy'), { method:'POST' })
      const data = await res.json()
      if (data.ok) {
        alert(`✅ ${data.message}\nCreated: ${data.count} templates - now test them!`)
        onCreated()
      } else {
        alert('❌ ' + (data.error || 'Failed'))
      }
    } catch (e) {
      alert('❌ ' + e.message)
    }
  }

  const totalCap = senders.filter(s=>form.sender_ids.includes(s.id)).reduce((sum,s)=>sum+s.daily_limit,0)

  const renderPreview = (tpl, lead, stripHtml=false) => {
    if (!tpl) return ''
    let out = tpl
    out = out.replace(/\{([^{}]*\|[^{}]*)\}/g, (m, inner) => {
      const opts = inner.split('|').map(s=>s.trim()).filter(Boolean)
      if (!opts.length) return ''
      return opts[Math.floor(Math.random()*opts.length)]
    })
    const vars = {
      first_name: lead.first_name, last_name: lead.last_name, title: lead.title,
      company_name: lead.company_name, clinic_name: lead.company_name,
      email: lead.email, from_name: lead.from_name || 'Orvexify',
      country: lead.country || 'United States',
      country_code: lead.country_code || 'US',
      timezone: lead.timezone || 'America/New_York',
      unsubscribe_link: '#unsubscribe',
      resubscribe_link: '#resubscribe',
      'First Name': lead.first_name, 'Last Name': lead.last_name, 'Title': lead.title,
      'Company Name': lead.company_name, 'Company': lead.company_name, 'Clinic Name': lead.company_name,
      'Email': lead.email, 'Country': lead.country || 'United States'
    }
    const getVal = (k) => {
      const key = k.trim()
      if (vars[key] !== undefined) return vars[key]
      const lk = key.toLowerCase()
      const found = Object.keys(vars).find(x=>x.toLowerCase()===lk)
      if (found) return vars[found]
      const norm = lk.replace(/[\s_\-]/g,'')
      const found2 = Object.keys(vars).find(x=>x.toLowerCase().replace(/[\s_\-]/g,'')===norm)
      return found2 ? vars[found2] : ''
    }
    out = out.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (m,k)=>getVal(k))
    out = out.replace(/\{\s*([A-Za-z0-9_\- ]+?)\s*\}/g, (m,k)=>{
      if (k.includes('|')) return m
      return getVal(k)
    })
    if (stripHtml) {
      out = out.replace(/<[^>]*>/g, '')
    }
    out = out.replace(/\s{2,}/g,' ')
    return out
  }
  const sampleLead = { first_name:'Faheem', last_name:'Ejaz', title:'CEO', company_name:'Miami Family Clinic', email:'faheeme4162913@gmail.com', from_name:'Orvexify', country:'United States', country_code:'US', timezone:'America/New_York' }

  const isHtmlTemplate = (body) => {
    if (!body) return false
    const lower = body.toLowerCase()
    return lower.includes('<!doctype') || lower.includes('<html') || lower.includes('<table') || lower.includes('<div style')
  }

  const previewIsHtml = isHtmlTemplate(form.body)

  return (
    <div className={s.wrap}>
      {/* PRESETS - EYE CATCHY */}
      <div className={s.card} style={{background:'linear-gradient(135deg,#f0f9ff 0%,#eef2ff 100%)', border:'1px solid #c7d2fe'}}>
        <div className={s.title}>🎨 Template Starters - Pick a style (Empty, ready to customize)</div>
        <div className={s.sub}>Choose HTML eye-catchy for 1st email (best CTR), plain text for follow-ups (best deliverability). Everything is empty - just fill in your content.</div>

        <div style={{marginTop:14, background:'#eef2ff', padding:'12px 16px', borderRadius:10, border:'1px dashed #a5b4fc', fontSize:12, color:'#4338ca', lineHeight:1.7}}>
          <b>📝 Available Variables — use anywhere in subject or body:</b><br/>
          <code style={{background:'white', padding:'2px 6px', borderRadius:4, margin:'2px 4px 2px 0', display:'inline-block'}}>{'{{first_name}}'}</code>
          <code style={{background:'white', padding:'2px 6px', borderRadius:4, margin:'2px 4px 2px 0', display:'inline-block'}}>{'{{last_name}}'}</code>
          <code style={{background:'white', padding:'2px 6px', borderRadius:4, margin:'2px 4px 2px 0', display:'inline-block'}}>{'{{company_name}}'}</code>
          <code style={{background:'white', padding:'2px 6px', borderRadius:4, margin:'2px 4px 2px 0', display:'inline-block'}}>{'{{country}}'}</code>
          <code style={{background:'white', padding:'2px 6px', borderRadius:4, margin:'2px 4px 2px 0', display:'inline-block'}}>{'{{timezone}}'}</code>
          <code style={{background:'white', padding:'2px 6px', borderRadius:4, margin:'2px 4px 2px 0', display:'inline-block'}}>{'{{title}}'}</code>
          <code style={{background:'white', padding:'2px 6px', borderRadius:4, margin:'2px 4px 2px 0', display:'inline-block'}}>{'{{city}}'}</code>
          <code style={{background:'white', padding:'2px 6px', borderRadius:4, margin:'2px 4px 2px 0', display:'inline-block'}}>{'{{email}}'}</code>
          <code style={{background:'white', padding:'2px 6px', borderRadius:4, margin:'2px 4px 2px 0', display:'inline-block'}}>{'{{from_name}}'}</code>
          <br/><br/>
          <b>🎲 Spintax (random pick):</b>
          <code style={{background:'white', padding:'2px 6px', borderRadius:4, margin:'2px 4px 2px 0', display:'inline-block'}}>{'{Hi|Hello|Hey}'}</code>
          <code style={{background:'white', padding:'2px 6px', borderRadius:4, margin:'2px 4px 2px 0', display:'inline-block'}}>{'{Noticed|Saw|Found}'}</code>
          <br/><br/>
          <b>🔗 Footer auto-links (optional):</b>
          <code style={{background:'white', padding:'2px 6px', borderRadius:4, margin:'2px 4px 2px 0', display:'inline-block'}}>{'{{unsubscribe_link}}'}</code>
          <code style={{background:'white', padding:'2px 6px', borderRadius:4, margin:'2px 4px 2px 0', display:'inline-block'}}>{'{{resubscribe_link}}'}</code>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:12, marginTop:14}}>
          {EYE_CATCHY_TEMPLATES.map(preset=>(
            <div key={preset.id} onClick={()=>applyPreset(preset)} style={{
              background:'white', border:'2px solid #e5e7eb', borderRadius:12, padding:14, cursor:'pointer',
              transition:'all 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={e=>e.currentTarget.style.borderColor='#4f46e5'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='#e5e7eb'}
            >
              <div style={{fontWeight:800, fontSize:13, marginBottom:6}}>{preset.name}</div>
              <div style={{fontSize:11, color:'#6b7280', marginBottom:8, lineHeight:1.4}}>{preset.subject ? preset.subject.substring(0,60) + '...' : 'Ready to customize'}</div>
              <div style={{fontSize:10, background:'#eef2ff', color:'#4338ca', padding:'4px 8px', borderRadius:20, display:'inline-block', fontWeight:700}}>Use This →</div>
            </div>
          ))}
        </div>

        <div style={{marginTop:12, display:'flex', gap:8, flexWrap:'wrap'}}>
          <button onClick={handleSeedFancy} style={{padding:'8px 16px', borderRadius:8, border:'none', background:'#4f46e5', color:'white', fontWeight:700, fontSize:12, cursor:'pointer'}}>🚀 Auto-Create 2 Fancy HTML Templates in DB (No Address)</button>
        </div>
      </div>

      <div className={s.card}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
          <div>
            <div className={s.title}>✉️ Tab 3: Templates - Fill Your Content</div>
            <div className={s.sub}>Vars: {'{{first_name}}'} {'{{company_name}}'} {'{{country}}'} {'{{timezone}}'} {'{{title}}'} {'{{city}}'} + Spintax {'{Hi|Hello}'}. HTML for 1st email, plain text for follow-ups. {editingId ? 'Editing' : 'New'} • Total {totalCap}/day</div>
          </div>
          <button onClick={handleNew} style={{padding:'8px 14px', borderRadius:8, border:'1px solid #e5e7eb', background:'white', fontWeight:600, fontSize:12, cursor:'pointer'}}>+ New Template</button>
        </div>
        
        <form onSubmit={handleSubmit} style={{display:'grid', gap:16, marginTop:14}}>
          <div className={s.grid2}>
            <div><label className={s.label}>Template Name {editingId ? '(Editing)' : '(New)'}</label><input className={s.input} value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="e.g. USA Clinics - No-Show Reducer" required /></div>
            <div><label className={s.label}>Total Daily: {totalCap}/day from {form.sender_ids.length} senders</label>
              <div style={{fontSize:12, background: totalCap>=150 ? '#dcfce7' : '#eef2ff', padding:'8px 12px', borderRadius:8, border:'1px solid #c7d2fe', color: totalCap>=150 ? '#065f46' : '#4338ca'}}>
                {totalCap}/day = {form.sender_ids.length} senders × avg {form.sender_ids.length ? Math.round(totalCap/form.sender_ids.length) : 50}/day
              </div>
            </div>
          </div>

          <div>
            <label className={s.label}>Select Senders</label>
            <div className={s.inboxSelector}>
              {senders.map(sdr=> {
                const sel = form.sender_ids.includes(sdr.id)
                return (
                  <div key={sdr.id} className={`${s.inboxOption} ${sel ? s.inboxOptionSelected : ''}`} onClick={()=>toggleSender(sdr.id)}>
                    <div className={`${s.check} ${sel ? s.checkSelected : ''}`}>{sel ? '✓' : ''}</div>
                    <div style={{flex:1}}><div style={{fontWeight:600}}>{sdr.from_name} - {sdr.smtp_user}</div><div style={{fontSize:11, color:'#6b7280'}}>{sdr.daily_limit}/day • {sdr.sent_today} sent • {sdr.remaining_today} left {sdr.remaining_today===0 ? '⚠️ LIMIT HIT' : ''}</div></div>
                    <div style={{fontSize:11, fontWeight:700, background: sel ? '#4f46e5' : '#f3f4f6', color: sel ? 'white' : '#6b7280', padding:'3px 8px', borderRadius:20}}>{sdr.daily_limit}/day</div>
                  </div>
                )
              })}
              {senders.length===0 && <div style={{fontSize:12, color:'#9ca3af', textAlign:'center', padding:10}}>No senders. Add in Tab 2 first.</div>}
            </div>
          </div>

          <div style={{background:'#f9fafb', padding:14, borderRadius:12, border:'1px solid #e5e7eb'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
              <div style={{fontWeight:700, fontSize:13}}>📧 Initial Email (Day 0) - {previewIsHtml ? '🎨 HTML (Eye-Catchy CSS)' : '✉️ Plain Text'}</div>
              <div style={{display:'flex', gap:6}}>
                <button type="button" onClick={()=>setPreviewMode('html')} style={{padding:'4px 10px', borderRadius:6, border:'1px solid', borderColor: previewMode==='html' ? '#4f46e5' : '#e5e7eb', background: previewMode==='html' ? '#4f46e5' : 'white', color: previewMode==='html' ? 'white' : '#6b7280', fontSize:11, fontWeight:600, cursor:'pointer'}}>HTML Preview</button>
                <button type="button" onClick={()=>setPreviewMode('text')} style={{padding:'4px 10px', borderRadius:6, border:'1px solid', borderColor: previewMode==='text' ? '#4f46e5' : '#e5e7eb', background: previewMode==='text' ? '#4f46e5' : 'white', color: previewMode==='text' ? 'white' : '#6b7280', fontSize:11, fontWeight:600, cursor:'pointer'}}>Text Preview</button>
              </div>
            </div>
            <div style={{display:'grid', gap:10}}>
              <div>
                <label className={s.label}>Subject - Preview: {renderPreview(form.subject, sampleLead, true) || '(empty)'}</label>
                <input className={s.input} value={form.subject} onChange={e=>setForm({...form, subject:e.target.value})} placeholder="e.g. {{first_name}}, quick question about {{company_name}}" />
                <div style={{fontSize:10, color:'#9ca3af', marginTop:4}}>Use: {'{{first_name}}'} {'{{company_name}}'} {'{{country}}'} + spintax {'{Hi|Hello}'}</div>
              </div>
              <div>
                <label className={s.label}>Body - HTML with inline CSS supported! (1st email = HTML recommended)</label>
                <textarea className={s.textarea} style={{minHeight:200, fontFamily: previewIsHtml ? 'monospace' : 'inherit', fontSize: previewIsHtml ? '11px' : '13px'}} value={form.body} onChange={e=>setForm({...form, body:e.target.value})} placeholder="Paste HTML or plain text here. Variables: {{first_name}}, {{company_name}}, {{country}}, {{timezone}}, {{title}}, {{city}}, {{from_name}}" />
              </div>
              
              <div style={{background:'white', padding:0, borderRadius:12, border:'1px solid #e5e7eb', overflow:'hidden'}}>
                <div style={{padding:'10px 14px', background:'#f9fafb', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div style={{fontSize:11, fontWeight:700, color:'#111827'}}>👁️ Live Preview - Sample: {sampleLead.first_name} {sampleLead.last_name} / {sampleLead.company_name}</div>
                  <div style={{fontSize:10, color:'#6b7280'}}>{previewIsHtml ? 'HTML Rendered' : 'Text Mode'}</div>
                </div>
                <div style={{padding: previewMode==='html' && previewIsHtml ? '0' : '12px'}}>
                  {!form.body ? (
                    <div style={{padding:20, textAlign:'center', color:'#9ca3af', fontSize:12}}>Preview will appear when you start typing...</div>
                  ) : previewMode==='html' && previewIsHtml ? (
                    <div style={{maxHeight:500, overflow:'auto', background:'#f4f5f7'}}>
                      <div dangerouslySetInnerHTML={{__html: renderPreview(form.body, sampleLead, false)}} />
                    </div>
                  ) : (
                    <>
                      <div style={{fontSize:12, background:'#eef2ff', padding:'8px 10px', borderRadius:6, marginBottom:8}}><b>Subject:</b> {renderPreview(form.subject, sampleLead, true) || '(empty)'}</div>
                      <div style={{fontSize:12, whiteSpace:'pre-wrap', background:'#f9fafb', padding:'12px', borderRadius:6, border:'1px solid #e5e7eb', lineHeight:1.6}}>{renderPreview(form.body, sampleLead, true) || '(empty)'}</div>
                    </>
                  )}
                </div>
                <div style={{padding:'8px 14px', background:'#f9fafb', borderTop:'1px solid #e5e7eb', fontSize:10, color:'#6b7280'}}>
                  Vars: {'{first_name}'} → Faheem, {'{company_name}'} → Miami Family Clinic, {'{country}'} → United States, {'{timezone}'} → America/New_York, {'{title}'} → CEO, {'{city}'} → Austin. Spintax {'{Hi|Hello|Hey}'}. Footer: Only Unsubscribe/Resubscribe.
                </div>
              </div>
            </div>
          </div>

          {[
            {key:'followup1', title:'Follow-up 1', desc:'Not opened → bump'},
            {key:'followup2', title:'Follow-up 2', desc:'Opened no click → case study'},
            {key:'followup3', title:'Follow-up 3', desc:'Not clicked → break-up'},
          ].map(f => (
            <div key={f.key} className={s.step}>
              <div className={s.stepHead}>
                <div className={s.stepTitle}>{f.title} <span className={s.stepBadge}>{f.desc}</span></div>
                <div className={s.conditionRow}>
                  <span className={s.condLabel}>IF</span>
                  <select className={s.select} style={{width:150, padding:'5px 8px', fontSize:12}} value={form[`${f.key}_condition`]} onChange={e=>setForm({...form, [`${f.key}_condition`]: e.target.value})}>
                    <option value="any">Any</option><option value="not_opened">Not Opened</option><option value="opened">Opened</option><option value="opened_no_click">Opened No Click</option><option value="clicked">Clicked</option><option value="not_clicked">Not Clicked</option>
                  </select>
                  <span className={s.condLabel}>AFTER</span>
                  <select className={s.select} style={{width:80, padding:'5px 8px', fontSize:12}} value={form[`${f.key}_delay`]} onChange={e=>setForm({...form, [`${f.key}_delay`]: parseInt(e.target.value)})}>
                    <option value={1}>1 day</option><option value={2}>2 days</option><option value={3}>3 days</option><option value={5}>5 days</option><option value={7}>7 days</option>
                  </select>
                </div>
              </div>
              <div style={{display:'grid', gap:8}}>
                <input className={s.input} placeholder="Subject (e.g. Re: {{company_name}} - bump)" value={form[`${f.key}_subject`]} onChange={e=>setForm({...form, [`${f.key}_subject`]: e.target.value})} />
                <textarea className={s.textarea} placeholder="Body - plain text recommended for follow-ups. Vars: {{first_name}}, {{company_name}}, {{country}}" value={form[`${f.key}_body`]} onChange={e=>setForm({...form, [`${f.key}_body`]: e.target.value})} />
              </div>
            </div>
          ))}

          <button type="submit" className={s.btnPrimary}>{editingId ? `✏️ Update Template` : `Create Template`}</button>
        </form>
      </div>

      {debugInfo && (
        <div className={s.card} style={{background:'#fef2f2', borderColor:'#fecaca'}}>
          <div style={{fontWeight:700, fontSize:13, color:'#991b1b'}}>🔍 Debug: {debugInfo.templateName} ({debugInfo.templateId})</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10, marginTop:10}}>
            <div style={{background:'white', padding:10, borderRadius:8, border:'1px solid #fecaca'}}><div style={{fontSize:11, color:'#6b7280'}}>Total Leads</div><div style={{fontWeight:700, fontSize:18}}>{debugInfo.counts.totalLeads}</div></div>
            <div style={{background:'white', padding:10, borderRadius:8, border:'1px solid #fecaca'}}><div style={{fontSize:11, color:'#6b7280'}}>Pending</div><div style={{fontWeight:700, fontSize:18, color:'#d97706'}}>{debugInfo.counts.pendingLeads}</div></div>
            <div style={{background:'white', padding:10, borderRadius:8, border:'1px solid #fecaca'}}><div style={{fontSize:11, color:'#6b7280'}}>Ready to Send</div><div style={{fontWeight:700, fontSize:18, color: debugInfo.counts.readyLeads===0 ? '#ef4444' : '#059669'}}>{debugInfo.counts.readyLeads}</div></div>
            <div style={{background:'white', padding:10, borderRadius:8, border:'1px solid #fecaca'}}><div style={{fontSize:11, color:'#6b7280'}}>Senders</div><div style={{fontWeight:700, fontSize:18}}>{debugInfo.senders.length}</div></div>
          </div>
          <div style={{marginTop:12}}>
            <div style={{fontWeight:600, fontSize:12}}>Senders Status:</div>
            {debugInfo.senders.map(sd=>(
              <div key={sd.id} style={{fontSize:11, background:'white', padding:'6px 10px', borderRadius:6, marginTop:4, border:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between'}}>
                <span>{sd.from_name} ({sd.smtp_user})</span>
                <span>{sd.sent_today}/{sd.daily_limit} daily rem {sd.remaining} | {sd.hourly}/{sd.hourly_limit} hourly | {sd.status} {sd.remaining===0 ? '⚠️ LIMIT HIT' : ''}</span>
              </div>
            ))}
          </div>
          <div style={{marginTop:12}}>
            <div style={{fontWeight:600, fontSize:12}}>Reasons:</div>
            <pre style={{fontSize:11, background:'white', padding:10, borderRadius:6, overflow:'auto'}}>{JSON.stringify(debugInfo.reasons, null, 2)}</pre>
          </div>
          <div style={{marginTop:12}}>
            <div style={{fontWeight:600, fontSize:12, color:'#991b1b'}}>Fix Hints:</div>
            <ul style={{fontSize:11, margin:'4px 0 0 16px', color:'#991b1b'}}>
              {debugInfo.fixHints.map((h,i)=><li key={i}>{h}</li>)}
              {debugInfo.fixHints.length===0 && <li>All good! Try Send Now again, or check SMTP logs in server console for actual send error (like Invalid login)</li>}
            </ul>
          </div>
          <div style={{marginTop:10}}>
            <div style={{fontWeight:600, fontSize:12}}>Sample Leads:</div>
            <pre style={{fontSize:10, background:'white', padding:10, borderRadius:6, overflow:'auto'}}>{JSON.stringify(debugInfo.sampleLeads, null, 2)}</pre>
          </div>
          <div style={{marginTop:10}}>
            <div style={{fontWeight:600, fontSize:12}}>Sender Selection Debug:</div>
            <pre style={{fontSize:10, background:'white', padding:10, borderRadius:6}}>{debugInfo.senderSelectionDebug?.join('\n')}</pre>
          </div>
          <button onClick={()=>setDebugInfo(null)} style={{marginTop:10, padding:'6px 12px', borderRadius:6, border:'1px solid #e5e7eb', background:'white', fontSize:11, cursor:'pointer'}}>Close Debug</button>
        </div>
      )}

      <div className={s.card}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{fontWeight:600, fontSize:13}}>Existing Templates - {templates.length}</div>
        </div>
        <div className={s.existingList} style={{marginTop:10}}>
          {templates.map(t=>(
            <div key={t.id} className={`${s.existingItem} ${selected?.id===t.id ? s.existingItemActive : ''}`} style={{flexDirection:'column', alignItems:'stretch'}}>
              <div style={{display:'flex', justifyContent:'space-between', width:'100%'}} onClick={()=>setSelected(t)}>
                <div><div style={{fontWeight:600, fontSize:13}}>{t.name} {editingId===t.id && '(Editing)'} {t.body?.includes('<html') || t.body?.includes('<table') ? '🎨' : '✉️'}</div><div style={{fontSize:11, color:'#6b7280'}}>{t.sender_names?.join(', ') || 'All senders'} • {t.totalDailyCapacity}/day • {t.stats?.total||0} leads • {t.stats?.pending||0} queued • {t.stats?.sent||0} sent</div></div>
                <div style={{fontSize:11, color:'#6b7280'}}>{new Date(t.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{display:'flex', gap:6, marginTop:10, flexWrap:'wrap'}}>
                <button onClick={()=>setSelected(t)} style={{padding:'5px 10px', borderRadius:6, border:'1px solid #e5e7eb', background:'white', fontSize:11, fontWeight:600, cursor:'pointer'}}>✏️ Edit</button>
                <button onClick={()=>handleDebug(t.id)} style={{padding:'5px 10px', borderRadius:6, border:'1px solid #fbbf24', background:'#fef3c7', fontSize:11, fontWeight:600, cursor:'pointer', color:'#92400e'}}>🔍 Debug Why 0?</button>
                <button onClick={()=>handleTest(t.id)} style={{padding:'5px 10px', borderRadius:6, border:'1px solid #bfdbfe', background:'#eff6ff', fontSize:11, fontWeight:600, cursor:'pointer', color:'#1e40af'}}>📤 Test Email</button>
                <button onClick={()=>handleSendNow(t.id)} style={{padding:'5px 10px', borderRadius:6, border:'1px solid #a7f3d0', background:'#dcfce7', fontSize:11, fontWeight:600, cursor:'pointer', color:'#065f46'}}>🚀 Send Now (Force)</button>
                <button onClick={()=>handleReset(t.id)} style={{padding:'5px 10px', borderRadius:6, border:'1px solid #fde68a', background:'#fef3c7', fontSize:11, fontWeight:600, cursor:'pointer', color:'#92400e'}}>🔄 Reset Pending</button>
                <button onClick={()=>handleDelete(t.id)} style={{padding:'5px 10px', borderRadius:6, border:'1px solid #fecaca', background:'#fee2e2', fontSize:11, fontWeight:600, cursor:'pointer', color:'#991b1b'}}>🗑️ Delete</button>
              </div>
            </div>
          ))}
          {templates.length===0 && <div style={{fontSize:12, color:'#9ca3af', textAlign:'center', padding:20}}>No templates yet. Create one above.</div>}
        </div>
      </div>
    </div>
  )
}