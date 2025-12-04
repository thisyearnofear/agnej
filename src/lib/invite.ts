export function generateInviteLink(gameId: number, referrerAddress: string): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/play?game=${gameId}&ref=${referrerAddress}`
}

export function copyToClipboard(text: string): Promise<void> {
    return navigator.clipboard.writeText(text)
}
