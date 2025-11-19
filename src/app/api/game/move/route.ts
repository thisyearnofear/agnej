import { NextResponse } from 'next/server';
import { getOracleContract } from '@/lib/oracle';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { gameId, playerAddress, moveVector, blockId } = body;

        console.log(`[Oracle] Processing move for Game ${gameId} by ${playerAddress}`);

        // 1. PHYSICS VERIFICATION (Serverless)
        // In a real implementation, we would spin up a headless physics world here
        // and apply the moveVector to the blockId to see if it collapses.
        // For MVP, we trust the client's "intent" but we could add basic checks.

        const isCollapse = false; // Mock result: Move was safe
        const isValidMove = true; // Mock result: Physics allowed this move

        if (!isValidMove) {
            return NextResponse.json({ error: 'Invalid move detected by physics engine' }, { status: 400 });
        }

        // 2. ON-CHAIN EXECUTION
        const contract = await getOracleContract();

        let tx;
        if (isCollapse) {
            console.log(`[Oracle] Collapse detected! Reporting to chain...`);
            tx = await contract.reportCollapse(gameId);
        } else {
            console.log(`[Oracle] Move safe. Completing turn...`);
            tx = await contract.completeTurn(gameId);
        }

        // Wait for transaction to be mined (optional, might timeout serverless function)
        // Better to return the hash and let client poll
        // await tx.wait(); 

        return NextResponse.json({
            success: true,
            txHash: tx.hash,
            result: isCollapse ? 'COLLAPSE' : 'SAFE'
        });

    } catch (error: any) {
        console.error('[Oracle] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
