'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { KeyRound, Eye, EyeOff, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const INPUT = 'w-full bg-apex-surface border border-apex-border rounded-xl px-4 py-2.5 pr-11 text-apex-text focus:border-apex-red/60 outline-none transition-colors text-sm'

function CampoPassword({ label, value, onChange, autoComplete, visible, onToggle, hint }: {
  label: string; value: string; onChange: (v: string) => void; autoComplete: string
  visible: boolean; onToggle: () => void; hint?: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-apex-muted mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          className={INPUT}
        />
        <button type="button" onClick={onToggle} tabIndex={-1}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-apex-muted hover:text-apex-text">
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint}
    </div>
  )
}

export function CambiarPassword() {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)

  const cortaNueva = nueva.length > 0 && nueva.length < 8
  const noCoinciden = confirmar.length > 0 && nueva !== confirmar

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!actual || !nueva || !confirmar) { toast.error('Rellena todos los campos'); return }
    if (nueva.length < 8) { toast.error('La nueva contraseña debe tener al menos 8 caracteres'); return }
    if (nueva !== confirmar) { toast.error('Las nuevas contraseñas no coinciden'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/perfil/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual, nueva, confirmar }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error al cambiar la contraseña'); return }

      toast.success('Contraseña actualizada correctamente')
      setActual(''); setNueva(''); setConfirmar(''); setVisible(false)
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="bg-apex-card border border-apex-border rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <KeyRound size={18} className="text-apex-red" />
        <h3 className="font-semibold text-lg">Cambiar contraseña</h3>
      </div>

      <CampoPassword label="Contraseña actual" value={actual} onChange={setActual}
        autoComplete="current-password" visible={visible} onToggle={() => setVisible(v => !v)} />

      <CampoPassword label="Nueva contraseña" value={nueva} onChange={setNueva}
        autoComplete="new-password" visible={visible} onToggle={() => setVisible(v => !v)}
        hint={<p className={cn('text-xs mt-1', cortaNueva ? 'text-red-400' : 'text-apex-muted')}>Mínimo 8 caracteres</p>} />

      <CampoPassword label="Confirmar nueva contraseña" value={confirmar} onChange={setConfirmar}
        autoComplete="new-password" visible={visible} onToggle={() => setVisible(v => !v)}
        hint={noCoinciden ? <p className="text-xs mt-1 text-red-400">Las contraseñas no coinciden</p> : undefined} />

      <button
        type="submit"
        disabled={saving || !actual || cortaNueva || noCoinciden || !nueva || !confirmar}
        className="flex items-center gap-2 px-5 py-2.5 bg-apex-red hover:bg-apex-red-dark text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
        <Check size={14} />
        {saving ? 'Guardando...' : 'Cambiar contraseña'}
      </button>
    </form>
  )
}
