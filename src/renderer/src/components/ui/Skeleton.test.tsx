import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Skeleton, { SkeletonLine, SkeletonAvatar, SkeletonText, SkeletonMessage } from './Skeleton'

describe('Skeleton component', () => {
  it('should render default text skeleton with shimmer', () => {
    const { container } = render(<Skeleton />)
    const shimmer = container.querySelector('.shimmer')
    expect(shimmer).toBeInTheDocument()
  })

  it('should render circle variant', () => {
    const { container } = render(<Skeleton variant="circle" width={48} height={48} />)
    const circle = container.querySelector('.rounded-full')
    expect(circle).toBeInTheDocument()
    expect(circle).toHaveClass('shimmer')
  })

  it('should render rect variant with custom dimensions', () => {
    const { container } = render(<Skeleton variant="rect" width={200} height={40} />)
    const rect = container.querySelector('.rounded-lg')
    expect(rect).toBeInTheDocument()
  })

  it('should render SkeletonLine with shimmer', () => {
    const { container } = render(<SkeletonLine width="60%" />)
    expect(container.querySelector('.shimmer')).toBeInTheDocument()
  })

  it('should render SkeletonAvatar as circle', () => {
    const { container } = render(<SkeletonAvatar size={40} />)
    const avatar = container.querySelector('.rounded-full')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveStyle('width: 40px')
    expect(avatar).toHaveStyle('height: 40px')
  })

  it('should render SkeletonText with multiple lines', () => {
    const { container } = render(<SkeletonText lines={5} />)
    const lines = container.querySelectorAll('.h-3')
    expect(lines.length).toBe(5)
  })

  it('should render SkeletonMessage with avatar and lines', () => {
    const { container } = render(<SkeletonMessage />)
    expect(container.querySelector('.rounded-full')).toBeInTheDocument()
    const lines = container.querySelectorAll('.h-3')
    expect(lines.length).toBeGreaterThan(0)
  })
})
