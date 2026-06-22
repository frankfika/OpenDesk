// Minimal sparkline SVG — used in TokenList and PortfolioHero
interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  positive?: boolean
  className?: string
}

export default function Sparkline({ data, width = 80, height = 24, positive = true, className }: SparklineProps): JSX.Element {
  if (!data || data.length < 2) {
    return <svg width={width} height={height} className={className} />
  }
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stepX = width / (data.length - 1)
  const points = data
    .map((v, i) => {
      const x = i * stepX
      const y = height - ((v - min) / range) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const stroke = positive ? '#1D8C80' : '#ef4444'
  const fill = positive ? 'rgba(29, 140, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)'
  const areaPath = `M0,${height} L${points.split(' ').join(' L')} L${width},${height} Z`

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={areaPath} fill={fill} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
