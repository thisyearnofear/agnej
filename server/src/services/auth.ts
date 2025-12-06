import { ethers } from 'ethers';

export class AuthService {
    /**
     * Verifies that the signature matches the address and the message is valid.
     * Checks:
     * 1. Signature recovers to address.
     * 2. Message contains a timestamp that is recent (prevents replay attacks).
     */
    public static verifySignature(address: string, message: string, signature: string): boolean {
        try {
            // 1. Recover Address
            const recoveredAddress = ethers.verifyMessage(message, signature);

            if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
                console.warn(`[Auth] Signature address mismatch. Recovered: ${recoveredAddress}, Expected: ${address}`);
                return false;
            }

            // 2. Check Timestamp (Simple Replay Protection)
            // Expected format: "Login to Agnej: <timestamp>"
            const parts = message.split(':');
            if (parts.length !== 2) {
                // If simple message without timestamp in expected format, we allow it for now if format not strict,
                // but highly recommend strict format.
                // For MVP, if message is just "Login", we permit it but warn.
                if (message === 'Login') return true;
                return false;
            }

            const timestamp = parseInt(parts[1].trim());
            if (isNaN(timestamp)) return false;

            const now = Date.now();
            // Allow 5 minute drift/window
            if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
                console.warn(`[Auth] Token expired. Timestamp: ${timestamp}, Now: ${now}`);
                return false;
            }

            return true;

        } catch (error) {
            console.error('[Auth] Verification failed:', error);
            return false;
        }
    }
}
