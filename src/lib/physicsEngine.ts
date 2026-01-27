/**
 * Physics Engine Module
 * 
 * Following Core Principles:
 * - MODULAR: Self-contained physics system
 * - CLEAN: Clear separation from React/UI
 * - TESTABLE: Can run without browser environment
 * 
 * Wraps Three.js + Physijs into a manageable API
 */

import {
  TOWER_CONFIG,
  WORLD_CONFIG,
  CAMERA_CONFIG,
  LIGHTING_CONFIG,
  ASSETS,
  getPhysicsConfig,
  type PhysicsConfig,
} from '@/config';

// Type definitions for Three.js/Physijs (since they're loaded dynamically)
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface BlockData {
  id: number;
  position: Vector3;
  quaternion: { x: number; y: number; z: number; w: number };
  velocity: Vector3;
  angularVelocity: Vector3;
  layer: number;
  isLocked: boolean;
}

export interface PhysicsState {
  blocks: BlockData[];
  timestamp: number;
}

export interface RaycastHit {
  object: {
    id: number;
    position: Vector3;
    quaternion: { x: number; y: number; z: number; w: number };
    userData: {
      layer: number;
      isLocked: boolean;
      originalEmissive?: number;
    };
    material?: {
      emissive?: { setHex: (color: number) => void; getHex: () => number };
      emissiveIntensity?: number;
    };
    setAngularVelocity: (v: Vector3) => void;
    setLinearVelocity: (v: Vector3) => void;
    applyCentralImpulse: (force: Vector3) => void;
  };
  point: Vector3;
}

export interface PhysicsEngineConfig {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  isSoloCompetitor: boolean;
  container: HTMLElement;
}

export interface DragState {
  selectedBlock: RaycastHit['object'] | null;
  dragStart: Vector3 | null;
  mousePos: Vector3;
}

export type PhysicsEventCallback = (event: { type: 'update' | 'collision' }) => void;

/**
 * Physics Engine Class
 * Manages the Three.js scene, Physijs physics, and game objects
 */
export class PhysicsEngine {
  private scene: any = null;
  private renderer: any = null;
  private camera: any = null;
  private materials: {
    table: any;
    block: any;
    lockedBlock: any;
  } = { table: null, block: null, lockedBlock: null };
  private interactionPlane: any = null;
  private blocks: any[] = [];
  private config: PhysicsConfig;
  private isSoloCompetitor: boolean;
  private container: HTMLElement;
  private animationFrameId: number | null = null;
  private eventListeners: Set<PhysicsEventCallback> = new Set();
  private lastUpdateTime = 0;

  constructor(config: PhysicsEngineConfig) {
    this.config = getPhysicsConfig(config.difficulty);
    this.isSoloCompetitor = config.isSoloCompetitor;
    this.container = config.container;
  }

  /**
   * Initialize the physics engine
   * Creates renderer, scene, camera, lights, and materials
   */
  async initialize(): Promise<void> {
    // Wait for libraries to be loaded
    if (typeof window === 'undefined' || !window.THREE || !window.Physijs) {
      throw new Error('Three.js and Physijs must be loaded before initializing PhysicsEngine');
    }

    const THREE = window.THREE;
    const Physijs = window.Physijs;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    const rect = this.container.getBoundingClientRect();
    this.renderer.setSize(
      rect.width || window.innerWidth,
      rect.height || window.innerHeight
    );
    this.renderer.setClearColor(0x2c3e50);
    this.renderer.shadowMap.enabled = true;
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Create physics scene
    this.scene = new Physijs.Scene({ fixedTimeStep: 1 / 120 });
    this.scene.setGravity(new THREE.Vector3(...WORLD_CONFIG.GRAVITY));

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      CAMERA_CONFIG.FOV,
      (rect.width || window.innerWidth) / (rect.height || window.innerHeight),
      CAMERA_CONFIG.NEAR,
      CAMERA_CONFIG.FAR
    );
    this.camera.position.set(...CAMERA_CONFIG.POSITION);
    this.camera.lookAt(...CAMERA_CONFIG.LOOK_AT);

    // Add lighting
    this.scene.add(new THREE.AmbientLight(LIGHTING_CONFIG.AMBIENT_COLOR));
    const directionalLight = new THREE.DirectionalLight(LIGHTING_CONFIG.DIRECTIONAL_COLOR);
    directionalLight.position.set(...LIGHTING_CONFIG.DIRECTIONAL_POSITION);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Load textures and create materials
    await this.createMaterials();

    // Create table
    this.createTable();

    // Create interaction plane (invisible, for drag detection)
    this.interactionPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(...WORLD_CONFIG.DRAG_PLANE_SIZE),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.interactionPlane.rotation.x = Math.PI / -2;
    this.scene.add(this.interactionPlane);

    // Setup update loop
    this.scene.addEventListener('update', () => {
      this.lastUpdateTime = Date.now();
      this.eventListeners.forEach(cb => cb({ type: 'update' }));
    });

    // Start render loop
    this.startRenderLoop();
  }

  /**
   * Create materials with textures
   */
  private async createMaterials(): Promise<void> {
    const THREE = window.THREE;
    const Physijs = window.Physijs;

    const loader = new THREE.TextureLoader();
    
    const woodTexture = loader.load(ASSETS.WOOD_TEXTURE);
    const plywoodTexture = loader.load(ASSETS.PLYWOOD_TEXTURE);

    this.materials.table = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: woodTexture }),
      this.config.friction,
      this.config.restitution
    );

    this.materials.block = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: plywoodTexture }),
      this.config.friction,
      this.config.restitution
    );

    this.materials.lockedBlock = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: plywoodTexture, color: 0xffaaaa }),
      this.config.friction,
      this.config.restitution
    );
  }

  /**
   * Create the table surface
   */
  private createTable(): void {
    const THREE = window.THREE;
    const Physijs = window.Physijs;

    const [tw, th, td] = WORLD_CONFIG.TABLE_SIZE;
    const table = new Physijs.BoxMesh(
      new THREE.BoxGeometry(tw, th, td),
      this.materials.table,
      0 // mass = 0 (static)
    );
    table.position.y = WORLD_CONFIG.TABLE_Y;
    table.receiveShadow = true;
    this.scene.add(table);
  }

  /**
   * Create the tower of blocks
   */
  createTower(): void {
    const THREE = window.THREE;
    const Physijs = window.Physijs;

    // Clear existing blocks
    this.clearBlocks();

    const [bw, bh, bd] = TOWER_CONFIG.BLOCK_SIZE;
    const geometry = new THREE.BoxGeometry(bw, bh, bd);

    for (let layer = 0; layer < TOWER_CONFIG.LAYERS; layer++) {
      const isLocked = this.isSoloCompetitor && TOWER_CONFIG.LOCKED_LAYERS.includes(layer);
      const material = isLocked ? this.materials.lockedBlock : this.materials.block;

      for (let blockIndex = 0; blockIndex < TOWER_CONFIG.BLOCKS_PER_LAYER; blockIndex++) {
        const block = new Physijs.BoxMesh(geometry, material, this.config.mass);
        
        // Position block
        block.position.y = TOWER_CONFIG.START_Y + layer * TOWER_CONFIG.LAYER_HEIGHT;
        
        if (layer % 2 === 0) {
          // Even layers: rotated 90 degrees, aligned on X axis
          block.rotation.y = TOWER_CONFIG.LAYER_ROTATION;
          block.position.x = TOWER_CONFIG.BLOCK_SPACING * blockIndex - TOWER_CONFIG.BLOCK_SPACING;
        } else {
          // Odd layers: aligned on Z axis
          block.position.z = TOWER_CONFIG.BLOCK_SPACING * blockIndex - TOWER_CONFIG.BLOCK_SPACING;
        }

        block.receiveShadow = true;
        block.castShadow = true;
        block.setDamping(this.config.damping, this.config.damping);
        block.userData = { layer, isLocked };

        this.scene.add(block);
        this.blocks.push(block);
      }
    }
  }

  /**
   * Clear all blocks from the scene
   */
  clearBlocks(): void {
    this.blocks.forEach(block => {
      this.scene.remove(block);
    });
    this.blocks = [];
  }

  /**
   * Get all blocks
   */
  getBlocks(): any[] {
    return this.blocks;
  }

  /**
   * Get block by index
   */
  getBlock(index: number): any | null {
    return this.blocks[index] || null;
  }

  /**
   * Get block index
   */
  getBlockIndex(block: any): number {
    return this.blocks.indexOf(block);
  }

  /**
   * Raycast from screen coordinates
   */
  raycast(clientX: number, clientY: number): RaycastHit[] {
    const THREE = window.THREE;
    const rect = this.renderer.domElement.getBoundingClientRect();

    const vector = new THREE.Vector3(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
      1
    );
    vector.unproject(this.camera);

    const ray = new THREE.Raycaster(
      this.camera.position,
      vector.sub(this.camera.position).normalize()
    );

    return ray.intersectObjects(this.blocks);
  }

  /**
   * Raycast against the interaction plane
   */
  raycastPlane(clientX: number, clientY: number): Vector3 | null {
    const THREE = window.THREE;
    const rect = this.renderer.domElement.getBoundingClientRect();

    const vector = new THREE.Vector3(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
      1
    );
    vector.unproject(this.camera);

    const ray = new THREE.Raycaster(
      this.camera.position,
      vector.sub(this.camera.position).normalize()
    );

    const hits = ray.intersectObject(this.interactionPlane);
    return hits.length > 0 ? hits[0].point : null;
  }

  /**
   * Apply impulse to a block
   */
  applyImpulse(block: any, force: Vector3): void {
    const THREE = window.THREE;
    block.setAngularVelocity(new THREE.Vector3(0, 0, 0));
    block.setLinearVelocity(new THREE.Vector3(0, 0, 0));
    block.applyCentralImpulse(force);
  }

  /**
   * Set the interaction plane height (for drag operations)
   */
  setInteractionPlaneY(y: number): void {
    this.interactionPlane.position.y = y;
  }

  /**
   * Step physics simulation
   */
  simulate(): void {
    if (this.scene) {
      this.scene.simulate();
    }
  }

  /**
   * Subscribe to physics events
   */
  subscribe(callback: PhysicsEventCallback): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  /**
   * Start the render loop
   */
  private startRenderLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }

  /**
   * Stop the render loop
   */
  stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Resize renderer
   */
  resize(): void {
    if (!this.camera || !this.renderer || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height);
  }

  /**
   * Get current physics state (for serialization)
   */
  getState(): PhysicsState {
    return {
      blocks: this.blocks.map((block, index) => ({
        id: index,
        position: { x: block.position.x, y: block.position.y, z: block.position.z },
        quaternion: {
          x: block.quaternion.x,
          y: block.quaternion.y,
          z: block.quaternion.z,
          w: block.quaternion.w,
        },
        velocity: { x: block.velocity.x, y: block.velocity.y, z: block.velocity.z },
        angularVelocity: {
          x: block.angularVelocity.x,
          y: block.angularVelocity.y,
          z: block.angularVelocity.z,
        },
        layer: block.userData.layer,
        isLocked: block.userData.isLocked,
      })),
      timestamp: Date.now(),
    };
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.stopRenderLoop();
    this.clearBlocks();
    
    if (this.scene) {
      // Remove all children
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement?.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }

    this.scene = null;
    this.renderer = null;
    this.camera = null;
    this.materials = { table: null, block: null, lockedBlock: null };
    this.interactionPlane = null;
    this.blocks = [];
    this.eventListeners.clear();
  }

  /**
   * Check if worker is ready (for Physijs)
   */
  isWorkerReady(): boolean {
    return this.scene?._worker !== undefined;
  }
}

/**
 * Factory function to create physics engine
 */
export function createPhysicsEngine(config: PhysicsEngineConfig): PhysicsEngine {
  return new PhysicsEngine(config);
}
