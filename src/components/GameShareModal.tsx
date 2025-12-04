'use client'

import React, { useState } from 'react'
import { shareGameAchievement, GameSharePayload, copyToClipboard } from '../lib/shareUtils'
import { generateInviteLink } from '../lib/invite'
import { useAccount } from 'wagmi'

interface GameShareModalProps {
  isOpen: boolean
  onClose: () => void
  payload: GameSharePayload
  title: string
  description?: string
}

export default function GameShareModal({
  isOpen,
  onClose,
  payload,
  title,
  description,
}: GameShareModalProps) {
  const { address } = useAccount()
  const [copied, setCopied] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    ('twitter' | 'farcaster' | 'discord' | 'telegram' | 'clipboard')[]
  >(['twitter'])

  if (!isOpen) return null

  const inviteLink = address ? generateInviteLink(0, address) : ''
  const sharePayload = { ...payload, inviteLink }

  const handleShare = async () => {
    await shareGameAchievement(sharePayload, selectedPlatforms)
    onClose()
  }

  const handleCopyLink = async () => {
    if (await copyToClipboard(inviteLink)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const platforms = [
    { id: 'twitter', label: '𝕏 Twitter', icon: '🐦' },
    { id: 'farcaster', label: '⛓️ Farcaster', icon: '⛓️' },
    { id: 'discord', label: '💜 Discord', icon: '💜' },
    { id: 'telegram', label: '✈️ Telegram', icon: '✈️' },
    { id: 'clipboard', label: '📋 Copy', icon: '📋' },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 p-6 rounded-2xl w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {description && (
          <p className="text-sm text-gray-400 mb-4">{description}</p>
        )}

        {/* Share Link Section */}
        <div className="bg-black/20 rounded-lg p-4 mb-4 border border-white/5">
          <label className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-2 block">
            Your Invite Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteLink}
              readOnly
              className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-gray-300 font-mono truncate"
            />
            <button
              onClick={handleCopyLink}
              className={`px-3 py-2 rounded font-semibold text-sm transition-colors ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-gray-300'
              }`}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Friends who join using your link get 5% bonus! 🎁
          </p>
        </div>

        {/* Platform Selection */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-3 block">
            Share On
          </label>
          <div className="grid grid-cols-3 gap-2">
            {platforms.map(platform => (
              <button
                key={platform.id}
                onClick={() =>
                  setSelectedPlatforms(prev =>
                    prev.includes(platform.id)
                      ? prev.filter(p => p !== platform.id)
                      : [...prev, platform.id]
                  )
                }
                className={`p-3 rounded-lg transition-all text-xs font-semibold flex flex-col items-center gap-1 ${
                  selectedPlatforms.includes(platform.id)
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                }`}
              >
                <span className="text-lg">{platform.icon}</span>
                <span className="text-xs">{platform.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-black/20 rounded-lg p-3 mb-4 border border-white/5">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">Preview</p>
          <p className="text-sm text-gray-300 line-clamp-4">
            {payload.type === 'solo' &&
              `🎮 I just scored ${payload.score} points on ${payload.difficulty} difficulty in Agnej!${
                payload.rank && payload.rank <= 10 ? ` 🏆 Rank #${payload.rank}` : ''
              } Can you beat my score? ${inviteLink}`}

            {payload.type === 'multiplayer' &&
              `🎮 I just survived a 7-player Agnej multiplayer game!${
                payload.survivors ? ` 👥 ${payload.survivors} survivor${payload.survivors !== 1 ? 's' : ''}` : ''
              }${payload.isWinner && payload.earnings ? ` 🏆 Won ${payload.earnings} ETH!` : ''} Think you can beat me? ${inviteLink}`}

            {payload.type === 'referral' &&
              `🚀 Join me in Agnej - an on-chain physics game with multiplayer battles! Get a 5% bonus when you use my referral link. ${inviteLink}`}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={selectedPlatforms.length === 0}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-all disabled:cursor-not-allowed"
          >
            🚀 Share
          </button>
        </div>
      </div>
    </div>
  )
}
