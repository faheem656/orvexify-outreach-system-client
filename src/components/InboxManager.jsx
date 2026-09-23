import React, { useState, useEffect } from 'react'
import s from './InboxManager.module.css'

export default function InboxManager({ onUpdate }) {
  const [inboxes, setInboxes] = useState([])
  const [form, setForm] = useState({ name:'Outreach 1', smtp_host:'smtp.zoho.com', smtp_port:465, smtp_secure:true, smtp_user:'', smtp_pass:'', imap_host:'imap.zoho.com', imap_port:993, imap_secure:true, imap_user:'', imap_pass:'', daily_limit:30, hourly_limit:8 })
  const [bulkText, setBulkText] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchInboxes = async () => {
    const res = await fetch('/api/inboxes')
    const data = await res.json()
    setInboxes(data)
    if (onUpdate) onUpdate()
  }
  useEffect(()=>{ fetchInboxes() }, [])

  const addInbox = async (e) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/inboxes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
    if (res.ok) { setForm({...form, smtp_user:'', smtp_pass:'', imap_user:'', imap_pass:'', name:`Outreach ${inboxes.length+2}`}); fetchInboxes() }
    setLoading(false)
  }

  const updateLimit = async (id, daily_limit) => {
    await fetch(`/api/inboxes/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ daily_limit: parseInt(daily_limit) }) })
    fetchInboxes()
  }

  const testInbox = async (id) => {
    const res = await fetch(`/api/inboxes/${id}/test`, { method:'POST' })
    const data = await res.json()
    alert(data.ok ? '✅ SMTP OK - Ready to send' : '❌ ' + data.error)
  }

  const deleteInbox = async (id) => {
    if (!confirm('Delete?')) return
    await fetch(`/api/inboxes/${id}`, { method:'DELETE' })
    fetchInboxes()
  }

  const bulkAdd = async () => {
    // format: email,pass per line OR json
    try {
      const lines = bulkText.split('\n').filter(l=>l.trim())
      const parsed = lines.map((line, idx) => {
        if (line.includes(',')) {
          const [email, pass] = line.split(',').map(s=>s.trim())
          return {
            name: `Outreach ${inboxes.length+idx+1}`,
            smtp_host: form.smtp_host, smtp_port: form.smtp_port, smtp_secure: true,
            smtp_user: email, smtp_pass: pass,
            imap_host: form.imap_host, imap_port: form.imap_port, imap_secure: true,
            imap_user: email, imap_pass: pass,
            daily_limit: 30, hourly_limit: 8
          }
        }
        return null
      }).filter(Boolean)
      if (parsed.length===0) return alert('Format: email,app-password per line\nExample:\noutreach1@getorvexify.com,pass1\noutreach2@getorvexify.com,pass2')
      const res = await fetch('/api/inboxes/bulk', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ inboxes: parsed }) })
      const data = await res.json()
      alert(`✅ ${data.count} inboxes added! Total capacity now ${ (inboxes.length + data.count) * 30 }/day`)
      setBulkText('')
      fetchInboxes()
    } catch(e){ alert(e.message) }
  }

  const totalCapacity = inboxes.reduce((s,i)=>s + i.daily_limit, 0)
  const totalSentToday = inboxes.reduce((s,i)=>s + i.sent_today, 0)
  const totalRemaining = totalCapacity - totalSentToday

  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <div className={s.totalBar}>
          <div className={s.totalItem}><div className={s.totalLabel}>Total Inboxes</div><div className={s.totalValue}>{inboxes.length}</div></div>
          <div className={s.totalItem}><div className={s.totalLabel}>Total Daily Capacity</div><div className={s.totalValue}>{totalCapacity}/day</div><div style={{fontSize:11, color:'#6b7280'}}>{inboxes.length} × 30 = {totalCapacity} (now) → {inboxes.length*50} after 1 month</div></div>
          <div className={s.totalItem}><div className={s.totalLabel}>Sent Today</div><div className={s.totalValue}>{totalSentToday}</div></div>
          <div className={s.totalItem}><div className={s.totalLabel}>Remaining Today</div><div className={s.totalValue} style={{color: totalRemaining===0 ? '#ef4444' : '#10b981'}}>{totalRemaining}</div></div>
        </div>

        <div className={s.title}>📧 Your Sending Inboxes - 30/day each → 150 total</div>
        <div className={s.sub}>Tum 3 inbox se 50-50-50 = 150/day bhej sakte ho. System auto distribute karega. Agar 1 inbox limit hit to dusre se bhejega. 2000 leads ek sath add karo, system roz 150 drip karega 13 din tak.</div>
        
        <div className={s.inboxGrid}>
          {inboxes.map(inbox => {
            const pct = Math.min(100, (inbox.sent_today / inbox.daily_limit) * 100)
            const isFull = inbox.remaining_today===0
            return (
              <div key={inbox.id} className={s.inboxCard} style={{borderColor: isFull ? '#fde68a' : undefined, background: isFull ? '#fffbeb' : 'white'}}>
                <div className={s.inboxTop}>
                  <div>
                    <div className={s.inboxName}>{inbox.name}</div>
                    <div className={s.inboxEmail}>{inbox.smtp_user}</div>
                  </div>
                  <span style={{fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20, background: inbox.status==='active' ? '#dcfce7' : '#fee2e2', color: inbox.status==='active' ? '#065f46' : '#991b1b'}}>{inbox.status}</span>
                </div>
                
                <div className={s.stats}>
                  <span className={`${s.statPill} ${isFull ? s.statWarn : s.statGood}`}>{inbox.sent_today}/{inbox.daily_limit} today</span>
                  <span className={s.statPill}>{inbox.sent_last_hour}/{inbox.hourly_limit} hour</span>
                  <span className={`${s.statPill} ${inbox.remaining_today>0 ? s.statGood : s.statDanger}`}>{inbox.remaining_today} left</span>
                </div>

                <div className={s.progress}><div className={s.progressBar} style={{width:`${pct}%`, background: isFull ? '#f59e0b' : undefined}}></div></div>

                <div className={s.actions}>
                  <select value={inbox.daily_limit} onChange={e=>updateLimit(inbox.id, e.target.value)} className={s.select} style={{width:110, padding:'5px 8px', fontSize:11}}>
                    <option value={15}>15/day</option>
                    <option value={20}>20/day</option>
                    <option value={25}>25/day</option>
                    <option value={30}>30/day (now)</option>
                    <option value={40}>40/day</option>
                    <option value={50}>50/day (after 1 month)</option>
                  </select>
                  <button onClick={()=>testInbox(inbox.id)} className={s.btnSmall}>Test</button>
                  <button onClick={()=>deleteInbox(inbox.id)} className={`${s.btnSmall} ${s.btnDanger}`}>Delete</button>
                </div>
                {isFull && <div style={{fontSize:11, color:'#92400e', marginTop:8, background:'#fef3c7', padding:'4px 8px', borderRadius:6}}>⚠️ Limit hit - remaining leads queued for tomorrow, will auto send from other inboxes</div>}
              </div>
            )
          })}
        </div>
        {inboxes.length===0 && <div style={{textAlign:'center', padding:20, color:'#9ca3af', fontSize:13}}>No inbox yet. Add 3 inboxes for 90/day, 5 for 150/day.</div>}
      </div>

      <div className={s.card}>
        <div className={s.title}>⚡ Bulk Add - 3 Inboxes Ek Sath (Tumhara Sawal)</div>
        <div className={s.sub}>Neeche format me likho, ek line pe ek inbox. System 1 click me 3 add kar dega aur total 90/day ya 150/day capacity bana dega.</div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
          <div>
            <label className={s.label}>Bulk Format: email,app-password per line</label>
            <textarea className={s.input} style={{minHeight:110, fontFamily:'monospace', fontSize:12}} placeholder={`outreach1@getorvexify.com, your-app-pass-1\noutreach2@getorvexify.com, your-app-pass-2\noutreach3@getorvexify.com, your-app-pass-3`} value={bulkText} onChange={e=>setBulkText(e.target.value)} />
            <button onClick={bulkAdd} className={s.btnPrimary} style={{marginTop:8}}>➕ Add {bulkText.split('\n').filter(l=>l.trim()).length || 3} Inboxes at Once - 30/day each</button>
            <div style={{fontSize:11, color:'#6b7280', marginTop:6}}>Total after add: {(inboxes.length + (bulkText.split('\n').filter(l=>l.trim()).length||0)) * 30}/day</div>
          </div>
          <div>
            <div className={s.label}>Single Add</div>
            <form onSubmit={addInbox} style={{display:'grid', gap:8}}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                <input className={s.input} placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
                <select className={s.select} value={form.daily_limit} onChange={e=>setForm({...form, daily_limit:e.target.value})}>
                  <option value={30}>30/day (now)</option>
                  <option value={50}>50/day (after month)</option>
                </select>
              </div>
              <input className={s.input} placeholder="SMTP Host (smtp.zoho.com)" value={form.smtp_host} onChange={e=>setForm({...form, smtp_host:e.target.value})} required />
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                <input className={s.input} placeholder="SMTP User" type="email" value={form.smtp_user} onChange={e=>setForm({...form, smtp_user:e.target.value})} required />
                <input className={s.input} placeholder="SMTP Pass" type="password" value={form.smtp_pass} onChange={e=>setForm({...form, smtp_pass:e.target.value})} required />
              </div>
              <input className={s.input} placeholder="IMAP Host (imap.zoho.com)" value={form.imap_host} onChange={e=>setForm({...form, imap_host:e.target.value})} required />
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                <input className={s.input} placeholder="IMAP User" value={form.imap_user} onChange={e=>setForm({...form, imap_user:e.target.value})} required />
                <input className={s.input} placeholder="IMAP Pass" type="password" value={form.imap_pass} onChange={e=>setForm({...form, imap_pass:e.target.value})} required />
              </div>
              <button type="submit" disabled={loading} className={s.btnPrimary}>{loading?'Adding...':'Add Single Inbox'}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
