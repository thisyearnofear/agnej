'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { http } from 'wagmi'
import LayoutWrapper from './transitions/LayoutWrapper'
import { SUPPORTED_CHAINS, RPC_ENDPOINTS } from '@/config'

const queryClient = new QueryClient()

const config = getDefaultConfig({
  appName: 'Agnej',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: SUPPORTED_CHAINS,
  transports: {
    [SUPPORTED_CHAINS[0].id]: http(RPC_ENDPOINTS[SUPPORTED_CHAINS[0].id]),
    [SUPPORTED_CHAINS[1].id]: http(RPC_ENDPOINTS[SUPPORTED_CHAINS[1].id]),
    [SUPPORTED_CHAINS[2].id]: http(RPC_ENDPOINTS[SUPPORTED_CHAINS[2].id]),
  },
  ssr: true,
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
