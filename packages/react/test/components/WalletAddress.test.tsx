import { describe, test, expect } from 'bun:test'
import React from 'react'
import { render } from '@testing-library/react'
import { WalletAddress } from '../../src/components/WalletAddress'

const TEST_ADDRESS = 'DRpbCBMxVnDK7maPMoGu4oXAoC2cZ5Z5f4LhNvvPZb3'

describe('WalletAddress', () => {
  test('renders truncated address by default', () => {
    const { container } = render(<WalletAddress address={TEST_ADDRESS} />)
    const span = container.querySelector('span')!
    // Default chars=4: first 4 + "..." + last 4
    expect(span.textContent).toBe('DRpb...PZb3')
  })

  test('renders full address when truncate is false', () => {
    const { container } = render(<WalletAddress address={TEST_ADDRESS} truncate={false} />)
    const span = container.querySelector('span')!
    expect(span.textContent).toBe(TEST_ADDRESS)
  })

  test('respects custom chars prop', () => {
    const { container } = render(<WalletAddress address={TEST_ADDRESS} chars={6} />)
    const span = container.querySelector('span')!
    // First 6 chars: "DRpbCB", last 6 chars: "vPZb3" -- actually let's compute:
    // address.slice(0, 6) = "DRpbCB"
    // address.slice(-6) = "vPZb3" -- wait, let me count properly
    // The address is: DRpbCBMxVnDK7maPMoGu4oXAoC2cZ5Z5f4LhNvvPZb3
    // slice(-6) from that = "vPZb3" has 5 chars... let me count the full address length
    // D-R-p-b-C-B-M-x-V-n-D-K-7-m-a-P-M-o-G-u-4-o-X-A-o-C-2-c-Z-5-Z-5-f-4-L-h-N-v-v-P-Z-b-3
    // That's 43 chars. slice(-6) = "vPZb3" -- no, 43-6=37, so chars 37-42: "vPZb3" is only 5...
    // Let me recount: D(0)R(1)p(2)b(3)C(4)B(5)M(6)x(7)V(8)n(9)D(10)K(11)7(12)m(13)a(14)P(15)
    // M(16)o(17)G(18)u(19)4(20)o(21)X(22)A(23)o(24)C(25)2(26)c(27)Z(28)5(29)Z(30)5(31)f(32)
    // 4(33)L(34)h(35)N(36)v(37)v(38)P(39)Z(40)b(41)3(42) = 43 chars
    // slice(-6) = chars at index 37,38,39,40,41,42 = "vvPZb3"
    const expected = `${TEST_ADDRESS.slice(0, 6)}...${TEST_ADDRESS.slice(-6)}`
    expect(span.textContent).toBe(expected)
  })

  test('has title attribute with full address', () => {
    const { container } = render(<WalletAddress address={TEST_ADDRESS} />)
    const span = container.querySelector('span')!
    expect(span.getAttribute('title')).toBe(TEST_ADDRESS)
  })

  test('applies className', () => {
    const { container } = render(<WalletAddress address={TEST_ADDRESS} className="custom-class" />)
    const span = container.querySelector('span')!
    expect(span.className).toBe('custom-class')
  })

  test('applies inline style', () => {
    const { container } = render(<WalletAddress address={TEST_ADDRESS} style={{ color: 'red' }} />)
    const span = container.querySelector('span')!
    expect(span.style.color).toBe('red')
  })

  test('handles short addresses', () => {
    const shortAddr = 'ABCD1234'
    const { container } = render(<WalletAddress address={shortAddr} />)
    const span = container.querySelector('span')!
    // chars=4: slice(0,4)="ABCD", slice(-4)="1234"
    expect(span.textContent).toBe('ABCD...1234')
  })
})
