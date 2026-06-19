import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor, Type, Shield, ShieldCheck } from 'lucide-react'
import { useSettingsStore } from '../../store/settings'
import { useThemeStore } from '../../store/theme'
import Switch from '../ui/Switch'
import DoctorPanel from './DoctorPanel'
import type { DoctorReport } from '@shared/types'

export default function GeneralPanel() {
  const { settings, update } = useSettingsStore()
  const { setTheme } = useThemeStore()
  const [fontSize, setFontSize] = useState(14)
  const [doctorReport, setDoctorReport] = useState<DoctorReport | null>(null)
  const [runningDoctor, setRunningDoctor] = useState(false)

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`
  }, [fontSize])

  async function handleRunDoctor() {
    setRunningDoctor(true)
    try {
      const report = await window.api.doctor.run()
      setDoctorReport(report)
    } catch (e) {
      console.error('Doctor failed:', e)
    } finally {
      setRunningDoctor(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section>
        <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
          Appearance
        </div>
        <label className="block text-[13px] font-medium mb-2">Theme</label>
        <div className="flex gap-2">
          {(
            [
              { value: 'light', icon: Sun, label: 'Light' },
              { value: 'dark', icon: Moon, label: 'Dark' },
              { value: 'system', icon: Monitor, label: 'System' }
            ] as const
          ).map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.value}
                onClick={() => {
                  update({ theme: t.value })
                  setTheme(t.value)
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                  settings.theme === t.value
                    ? 'bg-[var(--accent)]/5 border-[var(--accent)]/30 text-[var(--text-primary)] shadow-sm'
                    : 'bg-[var(--bg-sidebar)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>
        <div className="mt-4">
          <label className="block text-[13px] font-medium mb-2 flex items-center gap-2">
            <Type size={13} /> Font Size <span className="font-normal text-[var(--text-muted)]">{fontSize}px</span>
          </label>
          <input
            type="range"
            min={12}
            max={20}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </div>
      </section>

      <section className="border-t border-[var(--border)] pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
          Behavior
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[13px] font-medium mb-2">Language</label>
            <select
              value={settings.language || 'en'}
              onChange={(e) => update({ language: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl text-[13px] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
              <option value="es">Español</option>
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-2">Startup</label>
            <div className="flex gap-2">
              {(
                [
                  { value: 'restore', label: 'Restore last' },
                  { value: 'new', label: 'New chat' },
                  { value: 'tray', label: 'Start in tray' }
                ] as const
              ).map((b) => (
                <button
                  key={b.value}
                  onClick={() => update({ startupBehavior: b.value })}
                  className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                    settings.startupBehavior === b.value
                      ? 'bg-[var(--accent)]/5 border-[var(--accent)]/30 text-[var(--text-primary)] shadow-sm'
                      : 'bg-[var(--bg-sidebar)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
          Desktop Control
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-content)]">
          <div className="flex items-center gap-3">
            {settings.desktopEnabled ? (
              <ShieldCheck size={16} className="text-green-500" />
            ) : (
              <Shield size={16} className="text-[var(--text-muted)]" />
            )}
            <div>
              <div className="text-sm font-medium">Allow AI to control desktop</div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Screenshot, mouse, keyboard. Requires Screen Recording permission on macOS.
              </div>
            </div>
          </div>
          <Switch checked={settings.desktopEnabled} onCheckedChange={(v) => update({ desktopEnabled: v })} />
        </div>
      </section>

      <DoctorPanel report={doctorReport} running={runningDoctor} onRun={handleRunDoctor} />
    </div>
  )
}
