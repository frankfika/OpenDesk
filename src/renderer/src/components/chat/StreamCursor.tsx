export default function StreamCursor() {
  return (
    <span
      className="inline-block w-[2px] h-[1em] bg-[var(--accent)] ml-0.5 align-text-bottom"
      style={{
        animation: 'blink 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }}
      aria-hidden="true"
    />
  )
}
