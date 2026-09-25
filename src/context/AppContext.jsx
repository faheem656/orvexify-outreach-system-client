import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { API_BASE, apiUrl } from '../config.js'

const Ctx = createContext(null)

async function safeJson(url) {
  const res = await fetch(url)
  const text = await res.text()
  if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) return null
  return JSON.parse(text)
}

export function AppProvider({ children }) {
  const [templates, setTemplates] = useState([])
  const [stats, setStats] = useState(null)
  const [apiOnline, setApiOnline] = useState(true)

  const refreshTemplates = useCallback(async () => {
    const data = await safeJson(apiUrl('/api/templates')).catch(() => null)
    if (data === null) { setApiOnline(false); return }
    setApiOnline(true)
    setTemplates(Array.isArray(data) ? data : [])
  }, [])

  const refreshStats = useCallback(async () => {
    const data = await safeJson(apiUrl('/api/stats')).catch(() => null)
    if (data) setStats(data)
  }, [])

  const refresh = useCallback(() => { refreshTemplates(); refreshStats() }, [refreshTemplates, refreshStats])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 10000)
    return () => clearInterval(id)
  }, [refresh])

  return (
    <Ctx.Provider value={{ templates, stats, refresh, refreshTemplates, refreshStats, apiOnline }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)

export const API_BASE_URL = API_BASE
