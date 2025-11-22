import { useCallback } from 'react'
import { getPhysicsConfig } from './physicsHelpers'

declare const Physijs: any
declare const THREE: any

interface UseTowerBuilderProps {
    sceneRef: React.MutableRefObject<any>
    blocksRef: React.MutableRefObject<any[]>
    engineRef: React.MutableRefObject<any>
    scoredBlocksRef: React.MutableRefObject<Set<number>>
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
    gameMode: string
    setFallenCount: (count: number) => void
    setScore: (score: number) => void
    setGameOver: (over: boolean) => void
    setGameWon: (won: boolean) => void
    setTimeLeft: (time: number) => void
}

export const useTowerBuilder = ({
    sceneRef,
    blocksRef,
    engineRef,
    scoredBlocksRef,
    difficulty,
    gameMode,
    setFallenCount,
    setScore,
    setGameOver,
    setGameWon,
    setTimeLeft
}: UseTowerBuilderProps) => {

    const createTower = useCallback(() => {
        const sc = sceneRef.current
        const engine = engineRef.current

        if (!sc || !engine.materials.block) return

        const block_length = 5
        const block_height = 1
        const block_width = 1.5
        const block_offset = 3

        const block_geometry = new THREE.BoxGeometry(block_length, block_height, block_width)
        const mat = engine.materials.block
        const lMat = engine.materials.lockedBlock || mat

        const physicsConfig = getPhysicsConfig(difficulty)

        for (let i = 0; i < 16; i++) {
            // Determine if this layer is locked (top 2 layers: 14 and 15)
            const isLocked = gameMode === 'SOLO_COMPETITOR' && i >= 14
            const currentMat = isLocked ? lMat : mat

            for (let j = 0; j < 3; j++) {
                const block = new Physijs.BoxMesh(block_geometry, currentMat, physicsConfig.mass)
                block.position.y = (block_height / 2) + block_height * i
                if (i % 2 === 0) {
                    block.rotation.y = Math.PI / 2.01
                    block.position.x = block_offset * j - (block_offset * 3 / 2 - block_offset / 2)
                } else {
                    block.position.z = block_offset * j - (block_offset * 3 / 2 - block_offset / 2)
                }
                block.receiveShadow = true
                block.castShadow = true

                // Apply damping
                block.setDamping(physicsConfig.damping, physicsConfig.damping)

                // Store layer info for Competitor Mode
                block.userData = { layer: i, isLocked }

                sc.add(block)
                blocksRef.current.push(block)
            }
        }
    }, [sceneRef, blocksRef, engineRef, difficulty, gameMode])

    const resetTower = useCallback(() => {
        const sc = sceneRef.current
        const engine = engineRef.current
        if (!sc) return

        for (let i = 0; i < blocksRef.current.length; i++) {
            sc.remove(blocksRef.current[i])
        }
        blocksRef.current.length = 0
        engine.interaction.selectedBlock = null
        createTower()
        setFallenCount(0)
        setScore(0)
        setGameOver(false)
        setGameWon(false)
        setTimeLeft(30)
        scoredBlocksRef.current.clear()

        if (gameMode === 'SOLO_PRACTICE' || gameMode === 'SOLO_COMPETITOR') {
            sc.simulate()
        }
    }, [sceneRef, blocksRef, engineRef, scoredBlocksRef, gameMode, createTower, setFallenCount, setScore, setGameOver, setGameWon, setTimeLeft])

    return {
        createTower,
        resetTower
    }
}
