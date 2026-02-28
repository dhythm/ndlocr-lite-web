import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App.tsx'

describe('App', () => {
  it('renders the title', () => {
    render(<App />)
    expect(screen.getByText('NDLOCR Lite Web')).toBeInTheDocument()
  })
})
