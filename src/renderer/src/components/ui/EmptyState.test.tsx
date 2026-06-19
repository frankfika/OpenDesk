import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Bot } from 'lucide-react'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No items" description="Get started by adding one." />)
    expect(screen.getByText('No items')).toBeInTheDocument()
    expect(screen.getByText('Get started by adding one.')).toBeInTheDocument()
  })

  it('renders icon and actions', () => {
    const handleClick = vi.fn()
    render(
      <EmptyState title="Connect" icon={Bot} actions={[{ label: 'Add', onClick: handleClick, variant: 'primary' }]} />
    )
    const button = screen.getByRole('button', { name: /Add/i })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledOnce()
  })
})
