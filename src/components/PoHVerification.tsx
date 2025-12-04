'use client'

import React from 'react'
import { usePoHVerification } from '../hooks/usePoHVerification'
import { useAccount } from 'wagmi'

interface PoHVerificationProps {
  onVerified?: () => void
  showFullFlow?: boolean
  compact?: boolean
}

export default function PoHVerification({
  onVerified,
  showFullFlow = false,
  compact = false,
}: PoHVerificationProps) {
  const { isVerified, isVerifying, isChecking, error, initiatePoHVerification } = usePoHVerification()
  const { isConnected } = useAccount()

  if (!isConnected) {
    return null
  }

  // Already verified
  if (isVerified) {
    return (
      <div className={`rounded-lg border border-green-500/30 bg-green-500/10 p-3 ${compact ? '' : 'mb-4'}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">✅</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-green-300">Verified Human</div>
            {!compact && (
              <p className="text-xs text-gray-400 mt-1">
                Your scores count toward the verified leaderboard. Great job!
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Not verified - show action
  return (
    <div className={`rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 ${compact ? '' : 'mb-4'}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">🔐</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-blue-300 mb-1">
            {compact ? 'Verify as Human' : 'Proof of Humanity Verification'}
          </div>
          {!compact && (
            <p className="text-xs text-gray-400 mb-3">
              Enable Proof of Humanity verification to compete on the verified leaderboard. This prevents
              bots from manipulating rankings and ensures fair competition. The process takes 2-3 minutes and
              uses Sumsub for secure identity verification.
            </p>
          )}

          {error && (
            <div className="mb-2 text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/30">
              {error}
            </div>
          )}

          <button
            onClick={initiatePoHVerification}
            disabled={isVerifying || isChecking}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white text-sm font-semibold py-2 px-3 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {isVerifying || isChecking ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin">⏳</span>
                {isVerifying ? 'Verifying...' : 'Checking...'}
              </span>
            ) : (
              '🔗 Verify with Proof of Humanity'
            )}
          </button>

          {!compact && showFullFlow && (
            <div className="mt-3 text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-400">How it works:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click the button above to start verification</li>
                <li>A popup window will open with the Sumsub verification flow</li>
                <li>Provide your information to verify your identity</li>
                <li>Once verified, your account is marked as human on-chain</li>
                <li>Your verified status applies to all game leaderboards</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
