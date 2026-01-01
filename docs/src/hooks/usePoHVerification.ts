import { useEffect, useState, useCallback } from 'react'
import { useAccount, useSignMessage } from 'wagmi'

const POH_API_BASE = 'https://poh-api.linea.build'
const SUMSUB_SDK_URL = 'https://in.sumsub.com/websdk/p/uni_BKWTkQpZ2EqnGoY7'

interface PoHVerificationState {
  isChecking: boolean
  isVerified: boolean | null
  error: string | null
  isVerifying: boolean
}

export function usePoHVerification() {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [state, setState] = useState<PoHVerificationState>({
    isChecking: false,
    isVerified: null,
    error: null,
    isVerifying: false,
  })

  // Check PoH status via Linea API
  const checkPoHStatus = useCallback(async (checkAddress?: string) => {
    const targetAddress = checkAddress || address
    if (!targetAddress) return false

    setState(prev => ({ ...prev, isChecking: true, error: null }))
    try {
      const response = await fetch(`${POH_API_BASE}/poh/v2/${targetAddress}`)
      if (!response.ok) {
        setState(prev => ({ ...prev, isChecking: false, isVerified: false }))
        return false
      }

      const text = (await response.text()).trim()
      const isVerified = text === 'true'
      setState(prev => ({ ...prev, isChecking: false, isVerified }))
      return isVerified
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to check PoH status'
      setState(prev => ({ ...prev, isChecking: false, error: errorMsg }))
      return false
    }
  }, [address])

  // Create sign-in message for Sumsub flow
  const createSignInMessage = useCallback((userAddress: string): string => {
    const now = new Date().toISOString()
    return `in.sumsub.com wants you to sign in with your Ethereum account:\n${userAddress}\n\nI confirm that I am the owner of this wallet and consent to performing a risk assessment and issuing a Verax attestation to this address.\n\nURI: https://in.sumsub.com\nVersion: 1\nChain ID: 59144\nIssued At: ${now}`
  }, [])

  // Initiate Sumsub verification flow
  const initiatePoHVerification = useCallback(async () => {
    if (!address) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }))
      return
    }

    setState(prev => ({ ...prev, isVerifying: true, error: null }))

    try {
      // Check if already verified
      const alreadyVerified = await checkPoHStatus(address)
      if (alreadyVerified) {
        setState(prev => ({ ...prev, isVerifying: false, isVerified: true }))
        return
      }

      // Create sign-in message
      const signInMessage = createSignInMessage(address)

      // Sign the message
      const signature = await signMessageAsync({ message: signInMessage })

      // Create payload for Sumsub
      const payload = {
        signInMessage,
        signature,
      }

      // Encode as base64
      const msg = btoa(JSON.stringify(payload))

      // Open Sumsub flow
      const url = new URL(SUMSUB_SDK_URL)
      url.search = new URLSearchParams({ msg }).toString()

      // Open in new window or modal
      const width = 800
      const height = 600
      const left = Math.max(0, window.innerWidth - width) / 2
      const top = Math.max(0, window.innerHeight - height) / 2

      const popupWindow = window.open(
        url.toString(),
        'sumsub_verification',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      if (!popupWindow) {
        throw new Error('Could not open verification window')
      }

      // Listen for completion message from Sumsub popup
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== 'https://in.sumsub.com') return

        if (event.data?.status === 'completed') {
          // Verification complete, poll for attestation
          pollVerificationStatus(address)
          window.removeEventListener('message', handleMessage)
          if (popupWindow) popupWindow.close()
        }
      }

      window.addEventListener('message', handleMessage)

      // Also check periodically if window is still open
      const checkWindowInterval = setInterval(() => {
        if (popupWindow.closed) {
          clearInterval(checkWindowInterval)
          window.removeEventListener('message', handleMessage)
          // Poll one final time in case verification completed
          pollVerificationStatus(address)
        }
      }, 1000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Verification failed'
      setState(prev => ({ ...prev, isVerifying: false, error: errorMsg }))
    }
  }, [address, signMessageAsync, checkPoHStatus, createSignInMessage])

  // Poll Linea API until attestation is issued
  const pollVerificationStatus = useCallback(
    async (verifyAddress: string) => {
      const maxAttempts = 30 // 30 * 2s = 60s max wait
      let attempts = 0

      const pollInterval = setInterval(async () => {
        attempts++

        try {
          const isVerified = await checkPoHStatus(verifyAddress)
          if (isVerified) {
            setState(prev => ({ ...prev, isVerifying: false, isVerified: true }))
            clearInterval(pollInterval)
            return
          }
        } catch (err) {
          console.error('Polling error:', err)
        }

        if (attempts >= maxAttempts) {
          setState(prev => ({
            ...prev,
            isVerifying: false,
            error: 'Verification timed out. Please check back in a few moments.',
          }))
          clearInterval(pollInterval)
        }
      }, 2000)
    },
    [checkPoHStatus]
  )

  // Auto-check status when address changes
  useEffect(() => {
    if (address) {
      checkPoHStatus()
    }
  }, [address, checkPoHStatus])

  return {
    ...state,
    checkPoHStatus,
    initiatePoHVerification,
    address,
  }
}
