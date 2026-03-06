import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { listarCompartilhamentos, listarCompartilhamentosCompromisso } from '../lib/api'
import { notificarNovoCompartilhamento } from '../lib/notifications'

interface ContextType {
  pendentesCount: number
  refreshPendentes: () => Promise<void>
  resetBadge: () => void
}

const CompartilhamentoContext = createContext<ContextType>({
  pendentesCount: 0,
  refreshPendentes: async () => {},
  resetBadge: () => {},
})

export function CompartilhamentoProvider({ children }: { children: React.ReactNode }) {
  const [pendentesCount, setPendentesCount] = useState(0)
  const ultimoCount = useRef(0)

  const refreshPendentes = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        listarCompartilhamentos(),
        listarCompartilhamentosCompromisso(),
      ])
      const p1 = (r1.recebidos || []).filter((c: any) => c.STATUS === 'PENDENTE').length
      const p2 = (r2.recebidos || []).filter((c: any) => c.STATUS === 'PENDENTE').length
      const total = p1 + p2

      setPendentesCount(total)

      // Notifica apenas se o número aumentou desde a última vez
      if (total > ultimoCount.current) {
        notificarNovoCompartilhamento(total - ultimoCount.current).catch(() => {})
      }
      ultimoCount.current = total
    } catch {}
  }, [])

  const resetBadge = useCallback(() => {
    setPendentesCount(0)
    ultimoCount.current = 0
  }, [])

  return (
    <CompartilhamentoContext.Provider value={{ pendentesCount, refreshPendentes, resetBadge }}>
      {children}
    </CompartilhamentoContext.Provider>
  )
}

export const useCompartilhamento = () => useContext(CompartilhamentoContext)
