<script setup lang="ts">
import { useWallet } from './composables/useWallet'
import NFTGallery from './components/NFTGallery.vue'

const { connected, publicKey, connect, disconnect } = useWallet()
</script>

<template>
  <div class="app">
    <h1>Vue NFT Gallery</h1>
    <p class="subtitle">Browse NFTs on Solana using ts-tokens</p>

    <div class="wallet">
      <template v-if="connected">
        <p>Connected: {{ publicKey }}</p>
        <button @click="disconnect">Disconnect</button>
      </template>
      <template v-else>
        <button @click="connect">Connect Phantom</button>
      </template>
    </div>

    <NFTGallery v-if="connected && publicKey" :owner="publicKey" />
  </div>
</template>

<style>
:root {
  font-family: Inter, system-ui, sans-serif;
  color: #213547;
  background-color: #f5f5f5;
}

.app {
  max-width: 900px;
  margin: 2rem auto;
  padding: 0 1rem;
}

h1 {
  font-size: 2rem;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #666;
  margin-bottom: 1.5rem;
}

.wallet {
  margin-bottom: 2rem;
}

button {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  background: #42b883;
  color: white;
  font-size: 1rem;
  cursor: pointer;
}

button:hover {
  background: #38a373;
}
</style>
