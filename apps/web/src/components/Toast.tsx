'use client'

import { createContext, useContext, useCallback, useState, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastApi {
  toast: (message: string, kind?: ToastKind) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // No-op fallback so components don't crash if used outside the provider.
    return { toast: () => {}, success: () => {}, error: () => {}, info: () => {} }
  }
  return ctx
}

const ICONS = {
  success: <CheckCircle2 size={16} color="#22C55E" />,
  error: <AlertCircle size={16} color="#EF4444" />,
  info: <Info size={16} color="#3B82F6" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)
  const [mounted, setMounted] = useState(false)

  // Portal target only exists on the client.
  if (typeof window !== 'undefined' && !mounted) setMounted(true)

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => remove(id), 4000)
  }, [remove])

  const api: ToastApi = {
    toast: push,
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-live="polite"
            style={{
              position: 'fixed',
              bottom: 20,
              right: 20,
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxWidth: 'calc(100vw - 40px)',
            }}
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                role="status"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'var(--bg-elevated, #1a1a1a)',
                  border: '1px solid var(--bg-border, #272727)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  minWidth: 240,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  animation: 'stacksense-toast-in 0.18s ease-out',
                }}
              >
                {ICONS[t.kind]}
                <span style={{ fontSize: 13, color: 'var(--text-primary, #fff)', flex: 1 }}>{t.message}</span>
                <button
                  onClick={() => remove(t.id)}
                  aria-label="Dismiss notification"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #8A8A8A)', display: 'flex', padding: 0 }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
      <style>{`@keyframes stacksense-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </ToastContext.Provider>
  )
}
