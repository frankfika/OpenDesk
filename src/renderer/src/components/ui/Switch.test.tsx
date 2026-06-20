import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Switch from './Switch'

describe('Switch component', () => {
  it('should render unchecked by default', () => {
    render(<Switch checked={false} onCheckedChange={() => {}} aria-label="Test switch" />)
    const button = screen.getByRole('switch')
    expect(button).toHaveAttribute('aria-checked', 'false')
  })

  it('should render checked state', () => {
    render(<Switch checked={true} onCheckedChange={() => {}} aria-label="Test switch" />)
    const button = screen.getByRole('switch')
    expect(button).toHaveAttribute('aria-checked', 'true')
  })

  it('should call onCheckedChange when clicked', () => {
    const handler = vi.fn()
    render(<Switch checked={false} onCheckedChange={handler} aria-label="Test switch" />)
    const button = screen.getByRole('switch')
    fireEvent.click(button)
    expect(handler).toHaveBeenCalledWith(true)
  })

  it('should toggle on Enter key', () => {
    const handler = vi.fn()
    render(<Switch checked={false} onCheckedChange={handler} aria-label="Test switch" />)
    const button = screen.getByRole('switch')
    fireEvent.keyDown(button, { key: 'Enter' })
    expect(handler).toHaveBeenCalledWith(true)
  })

  it('should toggle on Space key', () => {
    const handler = vi.fn()
    render(<Switch checked={false} onCheckedChange={handler} aria-label="Test switch" />)
    const button = screen.getByRole('switch')
    fireEvent.keyDown(button, { key: ' ' })
    expect(handler).toHaveBeenCalledWith(true)
  })

  it('should have correct accessibility attributes', () => {
    render(<Switch checked={false} onCheckedChange={() => {}} id="test-id" aria-label="Accessibility test" />)
    const button = screen.getByRole('switch')
    expect(button).toHaveAttribute('id', 'test-id')
    expect(button).toHaveAttribute('aria-label', 'Accessibility test')
    expect(button).toHaveAttribute('tabIndex', '0')
  })
})
