import { describe, test, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import { defineComponent, computed, h } from 'vue'

// Recreate WalletAddress logic as a render function component for testing.
// Bun cannot parse .vue SFC files, so we replicate the component logic using
// defineComponent with a render function, matching the source at
// src/components/WalletAddress.vue
const WalletAddress = defineComponent({
  name: 'WalletAddress',
  props: {
    address: { type: String, required: true },
    truncate: { type: Boolean, default: true },
    chars: { type: Number, default: 4 },
  },
  setup(props) {
    const displayAddress = computed(() => {
      if (!props.truncate) return props.address
      return `${props.address.slice(0, props.chars)}...${props.address.slice(-props.chars)}`
    })
    return () => h('span', { title: props.address }, displayAddress.value)
  },
})

const TEST_ADDRESS = 'DRpbCBMxVnDK7maPMoGu4oXAoC2cZ5Z5f4LhNvvPZb3'

describe('WalletAddress', () => {
  test('renders truncated address by default', () => {
    const wrapper = mount(WalletAddress, { props: { address: TEST_ADDRESS } })
    expect(wrapper.text()).toBe('DRpb...PZb3')
  })

  test('renders full address when truncate is false', () => {
    const wrapper = mount(WalletAddress, {
      props: { address: TEST_ADDRESS, truncate: false },
    })
    expect(wrapper.text()).toBe(TEST_ADDRESS)
  })

  test('respects custom chars prop', () => {
    const wrapper = mount(WalletAddress, {
      props: { address: TEST_ADDRESS, chars: 6 },
    })
    expect(wrapper.text()).toBe('DRpbCB...vvPZb3')
  })

  test('has title attribute with full address', () => {
    const wrapper = mount(WalletAddress, { props: { address: TEST_ADDRESS } })
    expect(wrapper.find('span').attributes('title')).toBe(TEST_ADDRESS)
  })

  test('renders a span element', () => {
    const wrapper = mount(WalletAddress, { props: { address: TEST_ADDRESS } })
    expect(wrapper.find('span').exists()).toBe(true)
  })

  test('truncation with chars=8 shows correct prefix and suffix', () => {
    const wrapper = mount(WalletAddress, {
      props: { address: TEST_ADDRESS, chars: 8 },
    })
    const text = wrapper.text()
    expect(text.startsWith('DRpbCBMx')).toBe(true)
    expect(text.endsWith('hNvvPZb3')).toBe(true)
    expect(text).toContain('...')
  })

  test('short address with truncate still works', () => {
    const shortAddr = 'ABCD1234'
    const wrapper = mount(WalletAddress, {
      props: { address: shortAddr, chars: 4 },
    })
    expect(wrapper.text()).toBe('ABCD...1234')
  })

  test('chars=0 shows ellipsis with full suffix (slice(-0) returns whole string)', () => {
    const wrapper = mount(WalletAddress, {
      props: { address: TEST_ADDRESS, chars: 0 },
    })
    // In JS, slice(-0) === slice(0) which returns the full string
    expect(wrapper.text()).toBe(`...${TEST_ADDRESS}`)
  })
})
