/**
 * Social sharing utilities for Agnej
 * Enables sharing game achievements across Twitter, Discord, Telegram, etc.
 */

export interface ShareOptions {
  text: string
  url?: string
  hashtags?: string[]
}

/**
 * Share to Twitter
 */
export function shareToTwitter(text: string, url?: string) {
  const twitterText = encodeURIComponent(text + (url ? ` ${url}` : ''))
  const twitterUrl = `https://twitter.com/intent/tweet?text=${twitterText}`
  window.open(twitterUrl, '_blank', 'width=600,height=400')
}

/**
 * Share to Farcaster (via Warpcast)
 */
export function shareToFarcaster(text: string, url?: string) {
  const farcasterText = encodeURIComponent(text + (url ? ` ${url}` : ''))
  const farcasterUrl = `https://warpcast.com/~/compose?text=${farcasterText}`
  window.open(farcasterUrl, '_blank', 'width=600,height=400')
}

/**
 * Share to Discord (copy formatted text to clipboard for user to paste)
 */
export function shareToDiscord(text: string, url?: string) {
  const discordText = text + (url ? `\n${url}` : '')
  return navigator.clipboard.writeText(discordText).then(() => true).catch(() => false)
}

/**
 * Share to Telegram
 */
export function shareToTelegram(text: string, url?: string) {
  const fullText = encodeURIComponent(text + (url ? ` ${url}` : ''))
  const telegramUrl = `https://t.me/share/url?url=${fullText}&text=${fullText}`
  window.open(telegramUrl, '_blank', 'width=600,height=400')
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy:', err)
    return false
  }
}

/**
 * Create game share text for solo achievements
 */
export function createSoloShareText(
  difficulty: 'EASY' | 'MEDIUM' | 'HARD',
  score: number,
  rank?: number
): string {
  let text = `🎮 I just scored ${score} points on ${difficulty} difficulty in Agnej!`
  if (rank && rank <= 10) {
    text += ` 🏆 Rank #${rank}`
  }
  text += ' Can you beat my score?'
  return text
}

/**
 * Create game share text for multiplayer achievements
 */
export function createMultiplayerShareText(
  survivors: number,
  earnings?: number,
  isWinner: boolean = false
): string {
  let text = `🎮 I just survived a 7-player Agnej multiplayer game!`
  if (survivors > 0) {
    text += ` 👥 ${survivors} survivor${survivors !== 1 ? 's' : ''}`
  }
  if (isWinner && earnings) {
    text += ` 🏆 Won ${earnings} ETH!`
  }
  text += ' Think you can beat me?'
  return text
}

/**
 * Create referral share text
 */
export function createReferralShareText(bonusPercentage: number = 5): string {
  return `🚀 Join me in Agnej - an on-chain physics game with multiplayer battles! Get a ${bonusPercentage}% bonus when you use my referral link. Play solo or compete against 7 other players for real rewards.`
}

/**
 * Create full game sharing interface
 */
export interface GameSharePayload {
  type: 'solo' | 'multiplayer' | 'referral'
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
  score?: number
  rank?: number
  survivors?: number
  earnings?: number
  isWinner?: boolean
  inviteLink?: string
}

export function createGameShareMessage(payload: GameSharePayload): string {
  switch (payload.type) {
    case 'solo':
      return createSoloShareText(
        payload.difficulty || 'MEDIUM',
        payload.score || 0,
        payload.rank
      )
    case 'multiplayer':
      return createMultiplayerShareText(
        payload.survivors || 0,
        payload.earnings,
        payload.isWinner
      )
    case 'referral':
      return createReferralShareText()
    default:
      return 'Check out Agnej - an on-chain physics game!'
  }
}

/**
 * Share game achievement across multiple platforms
 */
export async function shareGameAchievement(
  payload: GameSharePayload,
  platforms: ('twitter' | 'farcaster' | 'discord' | 'telegram' | 'clipboard')[] = ['twitter']
) {
  const message = createGameShareMessage(payload)
  const url = payload.inviteLink || (typeof window !== 'undefined' ? window.location.href : '')

  const results: Record<string, boolean> = {}

  for (const platform of platforms) {
    try {
      switch (platform) {
        case 'twitter':
          shareToTwitter(message, url)
          results.twitter = true
          break
        case 'farcaster':
          shareToFarcaster(message, url)
          results.farcaster = true
          break
        case 'discord':
          results.discord = await shareToDiscord(message, url)
          break
        case 'telegram':
          shareToTelegram(message, url)
          results.telegram = true
          break
        case 'clipboard':
          results.clipboard = await copyToClipboard(`${message}\n${url}`)
          break
      }
    } catch (err) {
      console.error(`Failed to share to ${platform}:`, err)
      results[platform] = false
    }
  }

  return results
}
