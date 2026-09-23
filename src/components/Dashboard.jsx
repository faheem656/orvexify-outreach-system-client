import React from 'react'
import s from './Dashboard.module.css'

export default function Dashboard({ stats, templates }) {
  if (!stats) return <div className={s.card}>Loading...</div>
  
  const replyRate = stats.totalSent ? ((stats.replied / stats.totalSent) * 100).toFixed(1) : 0
  const clickRate = stats.totalSent ? ((stats.clicked / stats.totalSent) * 100).toFixed(1) : 0
  const bounceRate = stats.totalSent ? ((stats.bounced / stats.totalSent) * 100).toFixed(1) : 0

  return (
    <div style={{display:'grid', gap:16}}>
      <div className={s.grid4}>
        <div className={s.card}>
          <div className={s.label}>Total Leads / Country 🌍</div>
          <div className={s.valueRow}><div className={s.value}>{stats.totalLeads}</div><span className={`${s.badge} ${s.badgeGood}`}>{stats.pending} queued</span></div>
          <div className={s.sub}>
            {stats.countryBreakdown?.length ? `${stats.countryBreakdown.length} countries: ${stats.countryBreakdown.map(c=>`${c.flag} ${c.country_code}(${c.total})`).join(' ')}` : 'No country data yet - upload CSV with Country column'}
            <br/>Tum 2000 bhi add karoge to system roz {stats.totalCapacity}/day drip karega. Est: {stats.estimatedDays} days.
          </div>
        </div>
        <div className={s.card}>
          <div className={s.label}>Today's Sending • Timezone 🌍</div>
          <div className={s.valueRow}><div className={s.value}>{stats.totalSentToday}</div><div style={{fontSize:14, color:'#6b7280'}}>/ {stats.totalCapacity}</div></div>
          <div className={s.sub}>
            {stats.timezoneEnabled ? '🌍 Per-lead local 9-5: USA leads ko US time me, UK ko UK time me bhejega - Best deliverability' : 'Window: 9-4 EST'}
            <br/>{stats.senderCount} inboxes × ~{stats.senderCount ? Math.round(stats.totalCapacity/stats.senderCount) : 30}/day = {stats.totalCapacity}/day
          </div>
        </div>
        <div className={s.card} style={{borderColor: replyRate>3 ? '#86efac' : undefined}}>
          <div className={s.label}>Replied • Main KPI</div>
          <div className={s.valueRow}><div className={s.value} style={{color:'#065f46'}}>{stats.replied}</div><div style={{fontSize:14}}>({replyRate}%)</div></div>
          <div className={s.sub}>{replyRate>3 ? '✅ Good - Personalization working' : '⚠️ Try better icebreaker / subject'}</div>
        </div>
        <div className={s.card}>
          <div className={s.label}>Clicked / Bounced / Window</div>
          <div style={{fontSize:16, fontWeight:700}}>{stats.clicked} clicked ({clickRate}%)</div>
          <div style={{fontSize:13, color: bounceRate>2 ? '#dc2626' : '#6b7280', marginTop:6, fontWeight:600}}>{stats.bounced} bounced ({bounceRate}%) {bounceRate>2 ? '❌ List saaf karo!' : '✅ Clean'}</div>
          <div className={s.sub}>Window: {stats.sendWindow} • {stats.withinWindow ? '✅ Within' : '❌ Outside (Force bypass)'} • Open unreliable (Apple)</div>
        </div>
      </div>

      {stats.countryBreakdown && stats.countryBreakdown.length>0 && (
        <div className={`${s.card} ${s.tableCard}`}>
          <div className={s.tableHead}>
            <div className={s.tableTitle}>🌍 Leads by Country - Kis Mulk Ki Kitni Leads?</div>
            <div style={{fontSize:11, color:'#6b7280'}}>Timezone: Har lead uske local 9am-5pm me bhejega - USA night me to UK day me send</div>
          </div>
          <div style={{overflowX:'auto'}}>
            <table className={s.table}>
              <thead><tr><th>Flag</th><th>Country</th><th>Code</th><th>Timezone</th><th>Total</th><th>Pending</th><th>Sent</th><th>Bounced</th><th>Opened</th><th>Local Time Now</th></tr></thead>
              <tbody>
                {stats.countryBreakdown.map(c=>{
                  let localTime='-';
                  try { localTime = new Date().toLocaleString("en-US", {timeZone: c.timezone, hour:'2-digit', minute:'2-digit', hour12:true, timeZoneName:'short'}); } catch {}
                  return (
                    <tr key={c.country_code}>
                      <td style={{fontSize:20}}>{c.flag}</td>
                      <td style={{fontWeight:600}}>{c.country}</td>
                      <td><span style={{background:'#eef2ff', padding:'2px 6px', borderRadius:6, fontSize:11, fontWeight:700}}>{c.country_code}</span></td>
                      <td style={{fontSize:11}}>{c.timezone}</td>
                      <td style={{fontWeight:700}}>{c.total}</td>
                      <td style={{color:'#d97706', fontWeight:700}}>{c.pending}</td>
                      <td style={{color:'#059669'}}>{c.sent}</td>
                      <td style={{color: c.bounced>0 ? '#dc2626' : undefined}}>{c.bounced}</td>
                      <td>{c.opened}</td>
                      <td style={{fontSize:11, fontWeight:600}}>{localTime}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={`${s.card} ${s.tableCard}`}>
        <div className={s.tableHead}>
          <div className={s.tableTitle}>🎯 Templates - Multi-Inbox + Country + Timezone Distribution</div>
          <div style={{fontSize:11, color:'#6b7280'}}>Total capacity = sum of selected inboxes • Timezone: per-lead local 9-5</div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Template</th>
                <th>Inboxes (distribution)</th>
                <th>Daily Cap</th>
                <th>Total Leads</th>
                <th>Pending Queue</th>
                <th>Sent</th>
                <th>Replied</th>
                <th>Clicked</th>
                <th>Bounced</th>
              </tr>
            </thead>
            <tbody>
              {(templates||[]).map(c => (
                <tr key={c.id}>
                  <td style={{fontWeight:600}}>{c.name}</td>
                  <td style={{maxWidth:200, whiteSpace:'normal', fontSize:11}}>{c.sender_names?.length ? c.sender_names.join(', ') : 'All active inboxes (auto)'}</td>
                  <td><span style={{background:'#eef2ff', color:'#4f46e5', padding:'2px 8px', borderRadius:20, fontWeight:700, fontSize:11}}>{c.totalDailyCapacity}/day</span></td>
                  <td>{c.stats?.total||0}</td>
                  <td style={{color:'#d97706', fontWeight:700}}>{c.stats?.pending||0} queued</td>
                  <td>{c.stats?.sent||0}</td>
                  <td style={{color:'#065f46', fontWeight:700}}>{c.stats?.replied||0}</td>
                  <td>{c.stats?.clicked||0}</td>
                  <td style={{color: (c.stats?.bounced||0)>0 ? '#dc2626' : undefined}}>{c.stats?.bounced||0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(templates||[]).length===0 && <div className={s.empty}>No templates yet. Create in Templates tab.</div>}
        </div>
      </div>

      <div className={s.grid2}>
        <div className={`${s.card} ${s.infoBox} ${s.infoYellow}`}>
          <div style={{fontWeight:700, marginBottom:6}}>🌍 NEW: Country + Timezone System - Kaise Kaam Karega?</div>
          <ul style={{fontSize:12, lineHeight:'1.6', margin:0, paddingLeft:18}}>
            <li><b>CSV me Country column:</b> First Name, Last Name, Title, Company Name, Email, Country, Timezone (optional)</li>
            <li><b>Auto-detect:</b> Country blank ho to default USA + America/New_York</li>
            <li><b>Supported:</b> USA, UK, Canada, Australia, Germany, France, UAE, India, Pakistan, Singapore, Japan etc - 30+ countries</li>
            <li><b>Timezone per lead:</b> USA lead ko US time 9am-5pm me bhejega, UK lead ko UK time 9am-5pm me - Best deliverability!</li>
            <li><b>Example:</b> Agar NY me raat 2am hai to USA leads skip, lekin Dubai me 10am hai to UAE leads send honge</li>
            <li><b>Force bypass:</b> Send Now (Force) dabao to timezone ignore, immediate send</li>
            <li><b>Filter:</b> Tab 1 aur Tab 4 me Country filter - dekho kaunsi lead kis mulk ki hai</li>
            <li><b>Vars:</b> Email me {'{country}'} use kar sakte ho - Hi John from USA etc</li>
          </ul>
        </div>
        <div className={`${s.card} ${s.infoBox} ${s.infoGreen}`}>
          <div style={{fontWeight:700, marginBottom:6}}>✅ Tumhara Sawal - Deploy ke baad bhi na chale to?</div>
          <ul style={{fontSize:12, lineHeight:'1.6', margin:0, paddingLeft:18}}>
            <li>Tab 4 Reports → 🔍 Why Not Sending? Diagnose - pura reason</li>
            <li>🧪 Force Send 1 Lead Test - 1 lead try + error + sender dikhayega</li>
            <li>Reports row click → Modal me Country + Timezone + Sender + Status + Local Time</li>
            <li>Window: 0-23 karo .env me - ya Force use karo</li>
            <li>Country breakdown upar dekho - kis mulk ki kitni leads, unka local time kya hai</li>
          </ul>
          <div style={{marginTop:10, fontSize:11, background:'white', padding:8, borderRadius:6, border:'1px solid #bbf7d0'}}>
            <b>Sample CSV with Country:</b><br/>
            First Name,Last Name,Title,Company Name,Email,Country,Timezone<br/>
            John,Doe,CEO,Acme, john@acme.com,USA,America/New_York<br/>
            Sarah,Smith,Mgr,Bright,sarah@clinic.com,UK,Europe/London
          </div>
        </div>
      </div>
    </div>
  )
}
