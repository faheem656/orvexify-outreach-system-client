import React, { useState, useEffect } from 'react'
import s from './InboxManager.module.css'
import { apiUrl } from '../config.js'

export default function SendersTab({ onUpdate }) {
  const [senders, setSenders] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ from_name:'Orvexify', smtp_host:'smtp.gmail.com', smtp_port:587, smtp_secure:false, smtp_user:'', smtp_pass:'', daily_limit:50, hourly_limit:8 })
  const [bulk, setBulk] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchSenders = async () => {
    try {
      const res = await fetch(apiUrl('/api/senders'))
      const text = await res.text()
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) { setSenders([]); return }
      const data = JSON.parse(text)
      setSenders(Array.isArray(data) ? data : [])
      if (onUpdate) onUpdate()
    } catch { setSenders([]) }
  }
  useEffect(()=>{ fetchSenders() }, [])

  const handlePortChange = (port) => {
    const p = parseInt(port)||587
    let secure = false
    if (p===465) secure = true
    else if (p===587 || p===25 || p===2525) secure = false
    setForm({...form, smtp_port: p, smtp_secure: secure})
  }

  const handleHostPreset = (host) => {
    if (host.includes('gmail')) setForm({...form, smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_secure: false})
    else if (host.includes('zoho')) setForm({...form, smtp_host: 'smtp.zoho.com', smtp_port: 587, smtp_secure: false})
    else if (host.includes('outlook') || host.includes('office365')) setForm({...form, smtp_host: 'smtp.office365.com', smtp_port: 587, smtp_secure: false})
    else if (host.includes('orvexify')) setForm({...form, smtp_host: host, smtp_port: 587, smtp_secure: false})
    else setForm({...form, smtp_host: host})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const url = editingId ? apiUrl(`/api/senders/${editingId}`) : apiUrl('/api/senders')
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
      const text = await res.text()
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) { alert('❌ Server not running'); setLoading(false); return }
      const data = JSON.parse(text)
      if (data.id || data.ok) {
        alert(editingId ? '✅ Sender updated! Auto SSL fixed: port 465=secure ON, 587=secure OFF' : '✅ Sender added! Max 100/day. SSL auto-fixed')
        setEditingId(null)
        setForm({ from_name:'Orvexify', smtp_host:form.smtp_host, smtp_port:587, smtp_secure:false, smtp_user:'', smtp_pass:'', daily_limit:50, hourly_limit:8 })
        fetchSenders()
      } else alert('❌ ' + (data.error || 'Failed'))
    } catch (err) { alert('❌ ' + err.message) }
    setLoading(false)
  }

  const startEdit = (sender) => {
    setEditingId(sender.id)
    setForm({
      from_name: sender.from_name || '',
      smtp_host: sender.smtp_host || 'smtp.gmail.com',
      smtp_port: sender.smtp_port || 587,
      smtp_secure: sender.smtp_port===465,
      smtp_user: sender.smtp_user || '',
      smtp_pass: '',
      daily_limit: sender.daily_limit || 50,
      hourly_limit: sender.hourly_limit || 8
    })
    window.scrollTo({ top: 600, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm({ from_name:'Orvexify', smtp_host:'smtp.gmail.com', smtp_port:587, smtp_secure:false, smtp_user:'', smtp_pass:'', daily_limit:50, hourly_limit:8 })
  }

  const updateLimit = async (id, daily_limit) => {
    await fetch(apiUrl(`/api/senders/${id}`), { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ daily_limit: parseInt(daily_limit) }) })
    fetchSenders()
  }

  const testSender = async (id) => {
    try {
      const res = await fetch(apiUrl(`/api/senders/${id}/test`), { method:'POST' })
      const data = await res.json()
      if (data.ok) alert(`✅ ${data.message}`)
      else alert(`❌ ${data.error}\n\n💡 Fix: ${data.hint||'Check host/port/user/pass'}`)
    } catch (e) { alert('❌ ' + e.message) }
  }

  const deleteSender = async (id) => {
    if (!confirm('Delete this sender?')) return
    await fetch(apiUrl(`/api/senders/${id}`), { method:'DELETE' })
    fetchSenders()
  }

  const bulkAdd = async () => {
    const lines = bulk.split('\n').filter(l=>l.trim())
    const parsed = lines.map((line, idx) => {
      if (line.includes(',')) {
        const [email, pass, name] = line.split(',').map(v=>v.trim())
        return { from_name: name || `Orvexify ${senders.length+idx+1}`, smtp_host: form.smtp_host, smtp_port: form.smtp_port, smtp_secure: form.smtp_port===465, smtp_user: email, smtp_pass: pass, daily_limit: 50, hourly_limit: 8 }
      }
      return null
    }).filter(Boolean)
    if (parsed.length===0) return alert('Format: email,password,From Name')
    const res = await fetch(apiUrl('/api/senders/bulk'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ senders: parsed }) })
    const data = await res.json()
    alert(`✅ ${data.count} senders added! Default 50/day (max 100). SSL auto-fixed`)
    setBulk(''); fetchSenders()
  }

  const totalCap = senders.reduce((sum,i)=>sum+i.daily_limit,0)
  const totalSent = senders.reduce((sum,i)=>sum+i.sent_today,0)
  const totalRem = totalCap - totalSent

  const sslMismatch = form.smtp_port===465 && !form.smtp_secure || form.smtp_port===587 && form.smtp_secure

  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <div className={s.totalBar}>
          <div className={s.totalItem}><div className={s.totalLabel}>Total Senders</div><div className={s.totalValue}>{senders.length}</div></div>
          <div className={s.totalItem}><div className={s.totalLabel}>Total Daily Capacity</div><div className={s.totalValue}>{totalCap}/day</div><div style={{fontSize:11, color:'#6b7280'}}>{senders.length} × 50 = {senders.length*50} now → up to {senders.length*100} max</div></div>
          <div className={s.totalItem}><div className={s.totalLabel}>Sent Today</div><div className={s.totalValue}>{totalSent}</div></div>
          <div className={s.totalItem}><div className={s.totalLabel}>Remaining</div><div className={s.totalValue} style={{color: totalRem===0 ? '#ef4444' : '#10b981'}}>{totalRem}</div></div>
        </div>

        <div className={s.title}>📧 Tab 2: Sender Emails - Max 100/day per sender (default 50)</div>
        <div className={s.sub}>Daily limit: 50 default, max 100. SSL Auto-fix: port 465 = secure ON, port 587 = secure OFF. Gmail/Zoho/Outlook me 587 use karo.</div>
        
        <div className={s.inboxGrid}>
          {senders.map(sender => {
            const pct = Math.min(100, (sender.sent_today / sender.daily_limit) * 100)
            const isFull = sender.remaining_today===0
            return (
              <div key={sender.id} className={s.inboxCard} style={{borderColor: isFull ? '#fde68a' : editingId===sender.id ? '#6366f1' : undefined, background: isFull ? '#fffbeb' : editingId===sender.id ? '#eef2ff' : 'white'}}>
                <div className={s.inboxTop}>
                  <div>
                    <div className={s.inboxName}>{sender.from_name} {editingId===sender.id && '(Editing)'} {sender.has_password===false && '🔴 NO PASS'}</div>
                    <div className={s.inboxEmail}>{sender.smtp_user}</div>
                    <div style={{fontSize:10, color:'#6b7280', marginTop:2}}>{sender.smtp_host}:{sender.smtp_port} {sender.smtp_port===465 ? 'secure ON' : 'secure OFF'} {sender.has_password===false ? '🔴 PASS EMPTY!' : `pass len ${sender.pass_length||0}`}</div>
                    {sender.has_password===false && <div style={{fontSize:10, color:'#991b1b', background:'#fee2e2', padding:'2px 6px', borderRadius:4, marginTop:4, fontWeight:700}}>❌ Password EMPTY! Edit → Enter Hostinger SMTP password → Save</div>}
                  </div>
                  <span style={{fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20, background: sender.status==='active' ? '#dcfce7' : '#fee2e2', color: sender.status==='active' ? '#065f46' : '#991b1b'}}>{sender.status}</span>
                </div>
                <div className={s.stats}>
                  <span className={`${s.statPill} ${isFull ? s.statWarn : s.statGood}`}>{sender.sent_today}/{sender.daily_limit} today</span>
                  <span className={s.statPill}>{sender.sent_last_hour}/{sender.hourly_limit} hr</span>
                  <span className={`${s.statPill} ${sender.remaining_today>0 ? s.statGood : s.statDanger}`}>{sender.remaining_today} left</span>
                </div>
                <div className={s.progress}><div className={s.progressBar} style={{width:`${pct}%`}}></div></div>
                <div className={s.actions}>
                  <select value={sender.daily_limit} onChange={e=>updateLimit(sender.id, e.target.value)} className={s.select} style={{width:110, padding:'5px 8px', fontSize:11}}>
                    <option value={30}>30/day</option>
                    <option value={50}>50/day ⭐</option>
                    <option value={70}>70/day</option>
                    <option value={100}>100/day (max)</option>
                  </select>
                  <button onClick={()=>startEdit(sender)} className={s.btnSmall}>✏️ Edit</button>
                  <button onClick={()=>testSender(sender.id)} className={s.btnSmall}>Test SMTP</button>
                  <button onClick={()=>deleteSender(sender.id)} className={`${s.btnSmall} ${s.btnDanger}`}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={s.card} style={{background:'#fef2f2', borderColor:'#fecaca'}}>
        <div style={{fontWeight:700, fontSize:12, color:'#991b1b'}}>🔧 SSL Error Fix - wrong version number</div>
        <div style={{fontSize:11, color:'#991b1b', marginTop:6, lineHeight:'1.6'}}>
          Error <code>wrong version number</code> = port/secure mismatch.<br/>
          • <b>Gmail:</b> smtp.gmail.com port <b>587</b> secure <b>OFF</b> (STARTTLS) + App Password<br/>
          • <b>Zoho:</b> smtp.zoho.com port <b>587</b> secure <b>OFF</b> ya 465 ON<br/>
          • <b>Outlook:</b> smtp.office365.com port <b>587</b> secure <b>OFF</b><br/>
          • System auto-fix karta hai: 465 → secure ON, 587 → secure OFF.<br/>
          • <b>Daily Limit:</b> 50 default, max 100 per sender. 3 senders × 50 = 150/day. 3 × 100 = 300/day max.
        </div>
      </div>

      <div className={s.card}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <div className={s.title}>{editingId ? '✏️ Edit Sender - Max 100/day' : '➕ Add Sender - Default 50/day, Max 100'}</div>
          {editingId && <button onClick={cancelEdit} style={{padding:'6px 12px', borderRadius:8, border:'1px solid #e5e7eb', background:'white', fontSize:11, cursor:'pointer'}}>Cancel</button>}
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
          <div>
            <label className={s.label}>Bulk Add: email,password,From Name</label>
            <textarea className={s.input} style={{minHeight:120, fontFamily:'monospace', fontSize:12}} placeholder={`outreach1@gmail.com,app-pass,Orvexify Sales\noutreach2@getorvexify.com,pass,Orvexify`} value={bulk} onChange={e=>setBulk(e.target.value)} />
            <button onClick={bulkAdd} className={s.btnPrimary} style={{marginTop:8}}>➕ Add {bulk.split('\n').filter(l=>l.trim()).length || 3} Senders (50/day each)</button>
            <div style={{marginTop:10, display:'flex', gap:6, flexWrap:'wrap'}}>
              <button onClick={()=>handleHostPreset('smtp.gmail.com')} style={{padding:'4px 8px', borderRadius:6, border:'1px solid #e5e7eb', background:'white', fontSize:10}}>Gmail Preset (587 OFF)</button>
              <button onClick={()=>handleHostPreset('smtp.zoho.com')} style={{padding:'4px 8px', borderRadius:6, border:'1px solid #e5e7eb', background:'white', fontSize:10}}>Zoho Preset (587 OFF)</button>
              <button onClick={()=>handleHostPreset('smtp.office365.com')} style={{padding:'4px 8px', borderRadius:6, border:'1px solid #e5e7eb', background:'white', fontSize:10}}>Outlook Preset (587 OFF)</button>
            </div>
          </div>
          <div>
            <form onSubmit={handleSubmit} style={{display:'grid', gap:8}}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                <div><label className={s.label}>From Name *</label><input className={s.input} placeholder="Orvexify Sales" value={form.from_name} onChange={e=>setForm({...form, from_name:e.target.value})} required /></div>
                <div><label className={s.label}>Daily Limit (max 100)</label>
                  <select className={s.select} value={form.daily_limit} onChange={e=>setForm({...form, daily_limit:parseInt(e.target.value)})}>
                    <option value={30}>30/day (safe start)</option>
                    <option value={50}>50/day (recommended) ⭐</option>
                    <option value={70}>70/day</option>
                    <option value={100}>100/day (max for new domain)</option>
                  </select>
                </div>
              </div>
              <div><label className={s.label}>SMTP Host * (gmail/zoho/outlook)</label>
                <div style={{display:'flex', gap:6}}>
                  <input className={s.input} style={{flex:1}} placeholder="smtp.gmail.com" value={form.smtp_host} onChange={e=>handleHostPreset(e.target.value)} required />
                  <button type="button" onClick={()=>handleHostPreset(form.smtp_host)} style={{padding:'6px 10px', borderRadius:8, border:'1px solid #e5e7eb', background:'white', fontSize:10}}>Auto Port</button>
                </div>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                <div><label className={s.label}>SMTP Port * (587 recommended)</label>
                  <select className={s.select} value={form.smtp_port} onChange={e=>handlePortChange(e.target.value)}>
                    <option value={587}>587 - STARTTLS (Gmail/Zoho/Outlook) ✅ Recommended</option>
                    <option value={465}>465 - SSL (implicit) </option>
                    <option value={25}>25 - Plain</option>
                    <option value={2525}>2525 - Alternative</option>
                  </select>
                  <div style={{fontSize:10, color: sslMismatch ? '#ef4444' : '#6b7280', marginTop:2}}>
                    {form.smtp_port===465 ? 'Port 465 → secure ON (auto)' : 'Port 587 → secure OFF (auto) - fixes wrong version number'}
                    {sslMismatch && ' ⚠️ MISMATCH! Auto-fix applied'}
                  </div>
                </div>
                <div><label className={s.label}>Hourly Limit</label><input className={s.input} type="number" value={form.hourly_limit} onChange={e=>setForm({...form, hourly_limit:parseInt(e.target.value)})} /></div>
              </div>
              <div style={{fontSize:10, color:'#6b7280', background:'#f9fafb', padding:'6px 8px', borderRadius:6, border:'1px solid #e5e7eb'}}>
                Auto: Port 465 = secure true, Port 587/25/2525 = secure false. Max daily limit = 100. Current: <b>{form.smtp_host}:{form.smtp_port} secure {form.smtp_secure ? 'ON' : 'OFF'}</b>
              </div>
              <div><label className={s.label}>Email (SMTP User) *</label><input className={s.input} type="email" placeholder="outreach@getorvexify.com" value={form.smtp_user} onChange={e=>setForm({...form, smtp_user:e.target.value})} required /></div>
              <div><label className={s.label}>App Password * {editingId && '(blank to keep old)'}</label><input className={s.input} type="password" placeholder="••••••••" value={form.smtp_pass} onChange={e=>setForm({...form, smtp_pass:e.target.value})} required={!editingId} /></div>
              <button type="submit" disabled={loading} className={s.btnPrimary}>{loading ? 'Saving...' : editingId ? '✏️ Update Sender (max 100/day)' : '➕ Add Sender (default 50/day)'}</button>
              <div style={{fontSize:10, color:'#6b7280', textAlign:'center'}}>Use App Password for Gmail/Zoho. Port 587 secure OFF fixes wrong version number.</div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}