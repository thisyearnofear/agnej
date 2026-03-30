'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultConfig, connectorsForWallets } from '@rainbow-me/rainbowkit'
import { 
  rainbowWallet, 
  metaMaskWallet, 
  coinbaseWallet, 
  walletConnectWallet 
} from '@rainbow-me/rainbowkit/wallets'
import { WagmiProvider, createConfig, http } from 'wagmi'
import LayoutWrapper from './transitions/LayoutWrapper'
import { SUPPORTED_CHAINS, RPC_ENDPOINTS } from '@/config'

const queryClient = new QueryClient()

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        coinbaseWallet,
        rainbowWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: 'Agnej',
    projectId,
  }
)

// Dynamically generate transports for all supported chains
const transports = Object.fromEntries(
  SUPPORTED_CHAINS.map(chain => [chain.id, http(RPC_ENDPOINTS[chain.id])])
)

const config = createConfig({
  connectors,
  chains: SUPPORTED_CHAINS,
  transports,
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
