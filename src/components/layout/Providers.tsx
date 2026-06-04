'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#2A2A2A',
            color: '#F5F5F5',
            border: '1px solid #333',
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#22C55E', secondary: '#1C1C1C' },
          },
          error: {
            iconTheme: { primary: '#C0392B', secondary: '#F5F5F5' },
          },
        }}
      />
    </SessionProvider>
  )
}
