/**
 * MoveValidator: Single source of truth for move validation
 * 
 * Validates moves before applying them to physics world.
 * Principle: Clear separation of concerns - validation is independent of execution
 */

import { MoveData } from './types';
import { GameError, GameErrorCode, createGameError } from './errors';

export interface ValidationResult {
    isValid: boolean;
    error?: GameError;
}

export class MoveValidator {
    private readonly BLOCK_INDEX_MIN = 0;
    private readonly BLOCK_INDEX_MAX = 47; // 16 layers * 3 blocks per layer
    private readonly FORCE_MAGNITUDE_MAX = 100;
    private readonly POINT_DISTANCE_MAX = 10;

    /**
     * Validate move data structure and physics constraints
     */
    public validate(moveData: MoveData): ValidationResult {
        if (!moveData) {
            return {
                isValid: false,
                error: createGameError(GameErrorCode.INVALID_MOVE_DATA, 'Move data is missing')
            };
        }

        // Validate blockIndex
        if (typeof moveData.blockIndex !== 'number') {
            return {
                isValid: false,
                error: createGameError(GameErrorCode.INVALID_MOVE_DATA, 'blockIndex must be a number', { field: 'blockIndex' })
            };
        }

        if (moveData.blockIndex < this.BLOCK_INDEX_MIN || moveData.blockIndex > this.BLOCK_INDEX_MAX) {
            return {
                isValid: false,
                error: createGameError(GameErrorCode.INVALID_MOVE_DATA, 'blockIndex out of range', {
                    field: 'blockIndex',
                    min: this.BLOCK_INDEX_MIN,
                    max: this.BLOCK_INDEX_MAX
                })
            };
        }

        // Validate force vector
        const forceError = this.validateVector(moveData.force, 'force', this.FORCE_MAGNITUDE_MAX);
        if (forceError) return { isValid: false, error: forceError };

        // Validate point vector
        const pointError = this.validateVector(moveData.point, 'point', this.POINT_DISTANCE_MAX);
        if (pointError) return { isValid: false, error: pointError };

        return { isValid: true };
    }

    /**
     * Validate a 3D vector (force or point)
     */
    private validateVector(
        vector: { x: number; y: number; z: number },
        name: string,
        maxMagnitude: number
    ): GameError | null {
        if (!vector || typeof vector !== 'object') {
            return createGameError(GameErrorCode.INVALID_MOVE_DATA, `${name} must be an object`, { field: name });
        }

        if (typeof vector.x !== 'number' || typeof vector.y !== 'number' || typeof vector.z !== 'number') {
            return createGameError(GameErrorCode.INVALID_MOVE_DATA, `${name} must have x, y, z properties`, { field: name });
        }

        const magnitude = Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
        if (magnitude > maxMagnitude) {
            return createGameError(GameErrorCode.INVALID_MOVE_DATA, `${name} magnitude exceeds limit`, {
                field: name,
                magnitude,
                max: maxMagnitude
            });
        }

        // Check for NaN or Infinity
        if (!isFinite(vector.x) || !isFinite(vector.y) || !isFinite(vector.z)) {
            return createGameError(GameErrorCode.INVALID_MOVE_DATA, `${name} contains invalid values`, { field: name });
        }

        return null;
    }
}
