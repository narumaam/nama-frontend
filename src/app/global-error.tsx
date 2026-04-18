'use client'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => { Sentry.captureException(error) }, [error])
  return (
    <html lang="en"><body>
      <div style={{display:'flex',minHeight:'100vh',alignItems:'center',justifyContent:'center',background:'#0f172a',color:'white',flexDirection:'column',gap:'16px'}}>
        <div style={{fontSize:'48px'}}>⚠️</div>
        <h1 style={{fontSize:'24px',fontWeight:'bold'}}>Something went wrong</h1>
        <p style={{color:'#94a3b8',fontSize:'14px'}}>Our team has been notified.</p>
        {error.digest && <p style={{color:'#64748b',fontSize:'12px',fontFamily:'monospace'}}>Error ID: {error.digest}</p>}
        <button onClick={reset} style={{padding:'8px 24px',background:'#2563eb',color:'white',border:'none',borderRadius:'8px',cursor:'pointer'}}>Try again</button>
      </div>
    </body></html>
  )
}
