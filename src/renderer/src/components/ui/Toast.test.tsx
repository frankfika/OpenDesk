import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToastContainer } from './Toast'
import { useToastStore } from '../../store/toast'

describe('ToastContainer component', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('should render empty when no toasts', () => {
    render(<ToastContainer />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('should render a toast', () => {
    useToastStore.getState().success('Test success message')
    render(<ToastContainer />)
    expect(screen.getByText('Test success message')).toBeInTheDocument()
  })

  it('should render multiple toasts', () => {
    useToastStore.getState().success('First')
    useToastStore.getState().error('Second')
    useToastStore.getState().info('Third')
    render(<ToastContainer />)
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
    expect(screen.getByText('Third')).toBeInTheDocument()
  })

  it('should render toast with action button', () => {
    useToastStore.getState().success('With action', { label: 'Undo', onClick: () => {} })
    render(<ToastContainer />)
    expect(screen.getByText('Undo')).toBeInTheDocument()
  })
})
