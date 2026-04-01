'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet
} from '@rainbow-me/rainbowkit/wallets'
import { WagmiProvider } from 'wagmi'
import LayoutWrapper from './transitions/LayoutWrapper'
import { SUPPORTED_CHAINS, RPC_ENDPOINTS } from '@/config'

const queryClient = new QueryClient()

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

// Use RainbowKit's getDefaultConfig for proper chain support
const config = getDefaultConfig({
  chains: SUPPORTED_CHAINS,
  projectId,
  appName: 'Agnej',
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
