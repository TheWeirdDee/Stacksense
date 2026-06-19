'use client'
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface ToastAction {
  label: string
  href: string
}

export interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'loading'
  action?: ToastAction
  duration?: number
}

interface ToastContextType {
  toast: (message: string, type?: ToastMessage['type'], action?: ToastAction, duration?: number) => string
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  dismiss: (id: string) => void
  toasts: ToastMessage[]
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    // Fallback so components do not crash if used outside provider.
    return {
      toast: () => '',
      success: () => {},
      error: () => {},
      info: () => {},
      dismiss: () => {},
      toasts: [],
    }
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, type: ToastMessage['type'] = 'info', action?: ToastAction, duration = 6000) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast: ToastMessage = { id, message, type, action, duration }
      
      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id)
        }, duration)
      }
      return id
    },
    [dismiss]
  )

  const success = useCallback((message: string) => {
    toast(message, 'success')
  }, [toast])

  const error = useCallback((message: string) => {
    toast(message, 'error')
  }, [toast])

  const info = useCallback((message: string) => {
    toast(message, 'info')
  }, [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error, info, dismiss, toasts }}>
      {children}
      
      {/* Toast Portal Container */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none',
          maxWidth: '380px',
          width: '100%',
        }}
      >
        {toasts.map((t) => {
          const bgColor =
            t.type === 'success'
              ? 'rgba(16, 185, 129, 0.15)'
              : t.type === 'error'
              ? 'rgba(239, 68, 68, 0.15)'
              : t.type === 'loading'
              ? 'rgba(59, 130, 246, 0.15)'
              : 'rgba(30, 41, 59, 0.7)'

          const strokeColor =
            t.type === 'success'
              ? '#10B981'
              : t.type === 'error'
              ? '#EF4444'
              : t.type === 'loading'
              ? '#3B82F6'
              : 'var(--bg-border)'

          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                background: bgColor,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${strokeColor}`,
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
                borderRadius: 8,
                padding: '14px 16px',
                color: '#fff',
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                animation: 'slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                transition: 'opacity 0.2s, transform 0.2s',
              }}
            >
              <style>{`
                @keyframes slideIn {
                  from { opacity: 0; transform: translateY(12px) scale(0.96); }
                  to { opacity: 1; transform: translateY(0) scale(1); }
                }
              `}</style>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                {t.type === 'loading' && (
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      border: '2px solid rgba(255,255,255,0.2)',
                      borderTop: '2px solid #3B82F6',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.8s linear infinite',
                      flexShrink: 0,
                    }}
                  />
                )}
                {t.type === 'loading' && (
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                )}
                <div style={{ lineHeight: 1.4 }}>{t.message}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                {t.action && (
                  <a
                    href={t.action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: strokeColor,
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: 12,
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: `1px solid ${strokeColor}44`,
                      cursor: 'pointer',
                    }}
                  >
                    {t.action.label}
                  </a>
                )}
                <button
                  onClick={() => dismiss(t.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
