import React, { useState, useEffect } from 'react'
import s from './CampaignBuilder.module.css'

export default function CampaignBuilder({ campaigns, onCreated, selected, setSelected }) {
  const [inboxes, setInboxes] = useState([])
  const [form, setForm] = useState({
    name:'USA Clinics - Drip 150/day',
    inbox_ids:[],
    subject_template:'Quick question about {{clinic_name}}',
    body_template:`Hi {{first_name}},

{Noticed|Saw} {{clinic_name}} in {{city}} - {impressive|great} reviews.

We help US clinics cut no-shows by 60-70% with automated SMS + Email reminders. Most clinics save $3k-5k/month.

Worth a 10-min chat this week?

Best,
Furqan
Orvexify`,
    followup1_condition:'not_opened',
    followup1_delay:3,
    followup1_subject:'Re: Quick question about {{clinic_name}}',
    followup1_body:`{{first_name}} - just bumping this up.

Should I close your file for {{clinic_name}}?

If reducing no-shows is relevant, happy to share how a Miami clinic went from 28% to 7% no-show rate.`,
    followup2_condition:'opened_no_click',
    followup2_delay:5,
    followup2_subject:'How {{city}} clinics save $4k/mo on no-shows',
    followup2_body:`Hi {{first_name}},

Since you opened my last note - quick value:

Avg US clinic: 30 no-shows/month x $150 = $4500 lost.

Orvexify automates reminders + lets patients reschedule via link.

Want the 2-min demo? 

Reply NO if not relevant.`,
    followup3_condition:'not_clicked',
    followup3_delay:7,
    followup3_subject:'Closing the loop - {{clinic_name}}',
    followup3_body:`{{first_name}}, looks like not a priority.

I'll stop reaching out. If you ever want to cut no-shows at {{clinic_name}}, just reply YES.

Best,
Furqan`
  })

  useEffect(()=>{
    fetch('/api/inboxes').then(r=>r.json()).then(data=>{
      setInboxes(data)
      if (data.length && form.inbox_ids.length===0) {
        setForm(f=>({...f, inbox_ids: data.map(i=>i.id)}))
      }
    })
  }, [])

  const toggleInbox = (id) => {
    setForm(f=>{
      const exists = f.inbox_ids.includes(id)
      const newIds = exists ? f.inbox_ids.filter(i=>i!==id) : [...f.inbox_ids, id]
      return {...f, inbox_ids: newIds}
    })
  }

  const create = async (e) => {
    e.preventDefault()
    if (form.inbox_ids.length===0) return alert('Select at least 1 inbox. For 150/day, select 3 inboxes with 50/day each.')
    const res = await fetch('/api/campaigns', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...form, inbox_id: form.inbox_ids[0]}) })
    const data = await res.json()
    if (data.id) { 
      const totalCap = inboxes.filter(i=>form.inbox_ids.includes(i.id)).reduce((sum,i)=>sum+i.daily_limit,0)
      alert(`✅ Campaign created!\nDistribution: ${form.inbox_ids.length} inboxes × avg ${Math.round(totalCap/form.inbox_ids.length)}/day = ${totalCap}/day total\nNow upload CSV with 1000s leads - system will drip ${totalCap}/day`); 
      onCreated() 
    }
  }

  const selectedInboxes = inboxes.filter(i=>form.inbox_ids.includes(i.id))
  const totalDailyCap = selectedInboxes.reduce((s,i)=>s+i.daily_limit,0)

  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <div className={s.title}>🎯 Create Campaign - Multi-Inbox Drip</div>
        <div className={s.sub}>Tum 2000 leads ek sath daaloge, system roz {totalDailyCap||90}/day drip karega. 3 inbox select karo to 50-50-50 = 150/day auto distribute.</div>
        
        <form onSubmit={create} style={{display:'grid', gap:16}}>
          <div className={s.grid2}>
            <div><label className={s.label}>Campaign Name</label><input className={s.input} value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required /></div>
            <div><label className={s.label}>Total Daily Capacity: {totalDailyCap}/day from {form.inbox_ids.length} inboxes</label>
              <div style={{fontSize:12, background:'#eef2ff', padding:'8px 12px', borderRadius:8, border:'1px solid #c7d2fe'}}>
                {totalDailyCap} mails/day = {form.inbox_ids.length} inboxes × {form.inbox_ids.length ? Math.round(totalDailyCap/form.inbox_ids.length) : 30}/day avg
                {totalDailyCap>=150 ? ' ✅ 150/day goal hit' : ` • Need ${Math.ceil((150-totalDailyCap)/30)} more inboxes for 150/day`}
              </div>
            </div>
          </div>

          <div>
            <label className={s.label}>Select Sending Inboxes - Jitne chaho utne select karo (3 select = 150/day if 50 each)</label>
            <div className={s.inboxSelector}>
              {inboxes.map(i=> {
                const selected = form.inbox_ids.includes(i.id)
                return (
                  <div key={i.id} className={`${s.inboxOption} ${selected ? s.inboxOptionSelected : ''}`} onClick={()=>toggleInbox(i.id)}>
                    <div className={`${s.check} ${selected ? s.checkSelected : ''}`}>{selected ? '✓' : ''}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600}}>{i.name} - {i.smtp_user}</div>
                      <div style={{fontSize:11, color:'#6b7280'}}>{i.daily_limit}/day • {i.sent_today} sent today • {i.remaining_today} left</div>
                    </div>
                    <div style={{fontSize:11, fontWeight:700, background: selected ? '#4f46e5' : '#f3f4f6', color: selected ? 'white' : '#6b7280', padding:'3px 8px', borderRadius:20}}>{i.daily_limit}/day</div>
                  </div>
                )
              })}
              {inboxes.length===0 && <div style={{fontSize:12, color:'#9ca3af', textAlign:'center', padding:10}}>No inboxes. Add in Inboxes tab first.</div>}
            </div>
            <div style={{fontSize:11, color:'#6b7280', marginTop:6}}>Tip: 3 inbox select karo, har ek pe 50/day set karo = 150/day total. System auto round-robin: jis me jagah zyada, us se bhejega.</div>
          </div>

          <div style={{background:'#f9fafb', padding:14, borderRadius:12, border:'1px solid #e5e7eb'}}>
            <div style={{fontWeight:700, fontSize:13, marginBottom:10}}>📧 Step 1: Initial Email (Day 0) - Plain text, no link for best inbox</div>
            <div style={{display:'grid', gap:10}}>
              <div><label className={s.label}>Subject - use {'{{clinic_name}} {{first_name}}'}</label><input className={s.input} value={form.subject_template} onChange={e=>setForm({...form, subject_template:e.target.value})} /></div>
              <div><label className={s.label}>Body - Variables + spintax {'{Hi|Hello}'}</label><textarea className={s.textarea} style={{minHeight:130}} value={form.body_template} onChange={e=>setForm({...form, body_template:e.target.value})} /></div>
            </div>
          </div>

          {[
            {n:1, key:'followup1', title:'Follow-up 1', desc:'Not opened → bump'},
            {n:2, key:'followup2', title:'Follow-up 2', desc:'Opened no click → case study'},
            {n:3, key:'followup3', title:'Follow-up 3', desc:'Not clicked → break-up'},
          ].map(f => (
            <div key={f.key} className={s.step}>
              <div className={s.stepHead}>
                <div className={s.stepTitle}>{f.title} <span className={s.stepBadge}>{f.desc}</span></div>
                <div className={s.conditionRow}>
                  <span className={s.condLabel}>IF</span>
                  <select className={s.select} style={{width:150, padding:'5px 8px', fontSize:12}} value={form[`${f.key}_condition`]} onChange={e=>setForm({...form, [`${f.key}_condition`]: e.target.value})}>
                    <option value="any">Any (always)</option>
                    <option value="not_opened">Not Opened</option>
                    <option value="opened">Opened</option>
                    <option value="opened_no_click">Opened No Click</option>
                    <option value="clicked">Clicked</option>
                    <option value="not_clicked">Not Clicked</option>
                  </select>
                  <span className={s.condLabel}>AFTER</span>
                  <select className={s.select} style={{width:80, padding:'5px 8px', fontSize:12}} value={form[`${f.key}_delay`]} onChange={e=>setForm({...form, [`${f.key}_delay`]: parseInt(e.target.value)})}>
                    <option value={1}>1 day</option><option value={2}>2 days</option><option value={3}>3 days</option><option value={5}>5 days</option><option value={7}>7 days</option>
                  </select>
                </div>
              </div>
              <div style={{display:'grid', gap:8}}>
                <input className={s.input} placeholder="Subject" value={form[`${f.key}_subject`]} onChange={e=>setForm({...form, [`${f.key}_subject`]: e.target.value})} />
                <textarea className={s.textarea} placeholder="Body" value={form[`${f.key}_body`]} onChange={e=>setForm({...form, [`${f.key}_body`]: e.target.value})} />
              </div>
            </div>
          ))}

          <button type="submit" className={s.btnPrimary}>Create Campaign - {totalDailyCap}/day Drip with {form.inbox_ids.length} Inboxes</button>
        </form>
      </div>

      <div className={s.card}>
        <div style={{fontWeight:600, fontSize:13, marginBottom:10}}>Existing Campaigns - Click to select for Leads upload</div>
        <div className={s.existingList}>
          {campaigns.map(c=>(
            <div key={c.id} onClick={()=>setSelected(c)} className={`${s.existingItem} ${selected?.id===c.id ? s.existingItemActive : ''}`}>
              <div>
                <div style={{fontWeight:600, fontSize:13}}>{c.name}</div>
                <div style={{fontSize:11, color:'#6b7280'}}>{c.inbox_names?.join(', ') || 'All inboxes'} • {c.totalDailyCapacity}/day • {c.stats?.total||0} leads • {c.stats?.pending||0} queued</div>
              </div>
              <div style={{fontSize:11, color:'#6b7280'}}>{new Date(c.created_at).toLocaleDateString()}</div>
            </div>
          ))}
          {campaigns.length===0 && <div style={{fontSize:12, color:'#9ca3af', textAlign:'center', padding:10}}>No campaigns yet</div>}
        </div>
      </div>
    </div>
  )
}
