// Shared types for the Game component

export interface GameEngine {
    renderer: any | null
    camera: any | null
    scene: any | null
    materials: {
        block: any
        lockedBlock: any
    }
    interaction: {
        selectedBlock: any | null
        isMouseDown: boolean
        mousePos: any
        offset: any
        plane: any
    }
    lastPhysicsUpdate: number
}

export interface PhysicsConfig {
    friction: number
    restitution: number
    mass: number
    damping: number
}
