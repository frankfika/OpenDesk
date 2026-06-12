export default function TitleBar() {
  return (
    <div
      className="drag-region flex items-center shrink-0 w-full"
      style={{
        height: 'var(--titlebar-height)',
        borderBottom: '1px solid var(--border)'
      }}
    >
      {/* Traffic light space (macOS inset) */}
      <div style={{ width: 72 }} className="no-drag" />
      <div
        className="flex-1 text-center text-xs font-medium"
        style={{ color: 'var(--text-muted)', letterSpacing: '0.02em' }}
      >
        OpenDesk
      </div>
      <div style={{ width: 72 }} />
    </div>
  )
}
