'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { sepolia, mainnet, lineaSepolia } from 'wagmi/chains'
import LayoutWrapper from './transitions/LayoutWrapper'

const queryClient = new QueryClient()

const config = getDefaultConfig({
  appName: 'Agnej',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id', // Use env var
  chains: [lineaSepolia, sepolia, mainnet],
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
