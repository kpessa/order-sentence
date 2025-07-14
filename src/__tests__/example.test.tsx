import { renderWithProviders } from './utils/test-utils'
import { screen } from '@testing-library/react'

// Simple test to verify testing setup is working
describe('Testing Setup', () => {
  it('should render a simple component', () => {
    const TestComponent = () => <div>Hello, World!</div>
    
    renderWithProviders(<TestComponent />)
    
    expect(screen.getByText('Hello, World!')).toBeInTheDocument()
  })

  it('should have access to Jest globals', () => {
    expect(jest).toBeDefined()
    expect(expect).toBeDefined()
    expect(describe).toBeDefined()
    expect(it).toBeDefined()
  })

  it('should have access to testing-library matchers', () => {
    const TestComponent = () => <div data-testid="test-element">Test</div>
    
    renderWithProviders(<TestComponent />)
    
    const element = screen.getByTestId('test-element')
    expect(element).toBeInTheDocument()
    expect(element).toHaveTextContent('Test')
  })
})