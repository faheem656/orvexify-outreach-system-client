import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import s from './Layout.module.css'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/leads', label: 'Leads', icon: '👥' },
  { to: '/senders', label: 'Senders & Limits', icon: '📧' },
  { to: '/templates', label: 'Templates', icon: '✉️' },
  { to: '/reports', label: 'Reports', icon: '📈' },
  { to: '/emails', label: 'Email Log', icon: '📋' },
]

export default function Layout() {
  const { stats, apiOnline } = useApp()
  const inWindow = stats?.withinWindow
  return (
    <div className={s.shell}>
      <aside className={s.sidebar}>
        <div className={s.logo}>
          <div className={s.logoIcon}>O</div>
          <div>
            <div className={s.logoTitle}>Orvexify Mailing</div>
            <div className={s.logoSub}>SMTP + Hostinger API</div>
          </div>
        </div>
        <nav className={s.nav}>
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `${s.navItem} ${isActive ? s.navActive : ''}`}>
              <span className={s.navIcon}>{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={s.sideFoot}>
          <div className={s.statusDot} style={{ background: apiOnline ? '#10b981' : '#ef4444' }} />
          <span>{apiOnline ? 'API connected' : 'API offline'}</span>
        </div>
      </aside>

      <div className={s.main}>
        <header className={s.topbar}>
          <div className={s.topLeft}>
            <span className={s.dot} style={{ background: inWindow === false ? '#ef4444' : '#10b981' }} />
            <span className={s.topText}>
              {stats
                ? `${stats.totalSentToday}/${stats.totalCapacity} today • ${stats.pending} queued • ${stats.senderCount} senders • ${stats.replied} replied`
                : 'Loading...'}
            </span>
          </div>
          <div className={s.topRight}>
            {stats?.estimatedDays > 0 && <span className={s.pillBlue}>{stats.estimatedDays}d left</span>}
            {inWindow === false && <span className={s.pillRed}>⏰ Outside {stats?.sendWindow} — use Force Send</span>}
            {inWindow === true && <span className={s.pillGreen}>✅ {stats?.sendWindow} Active</span>}
          </div>
        </header>
        <main className={s.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
