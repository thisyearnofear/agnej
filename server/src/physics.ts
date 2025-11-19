import * as CANNON from 'cannon-es';

export class PhysicsWorld {
    private world: CANNON.World;
    private blocks: CANNON.Body[] = [];
    private table: CANNON.Body;
    private ground: CANNON.Body;

    constructor() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -30, 0); // Match client gravity
        this.world.broadphase = new CANNON.NaiveBroadphase();
        (this.world.solver as CANNON.GSSolver).iterations = 10;

        // Create Materials
        const tableMaterial = new CANNON.Material('table');
        const blockMaterial = new CANNON.Material('block');

        const tableBlockContact = new CANNON.ContactMaterial(tableMaterial, blockMaterial, {
            friction: 0.9,
            restitution: 0.2
        });
        this.world.addContactMaterial(tableBlockContact);

        const blockBlockContact = new CANNON.ContactMaterial(blockMaterial, blockMaterial, {
            friction: 0.4,
            restitution: 0.4
        });
        this.world.addContactMaterial(blockBlockContact);

        // Ground/Table
        this.ground = new CANNON.Body({
            mass: 0, // Static
            material: tableMaterial
        });
        this.ground.addShape(new CANNON.Box(new CANNON.Vec3(25, 0.5, 25)));
        this.ground.position.set(0, -0.5, 0);
        this.world.addBody(this.ground);

        // Table (Visual representation match)
        this.table = new CANNON.Body({
            mass: 0,
            material: tableMaterial
        });
        this.table.addShape(new CANNON.Box(new CANNON.Vec3(25, 0.5, 25)));
        this.table.position.set(0, -0.5, 0);
        this.world.addBody(this.table);

        this.createTower(blockMaterial);
    }

    private createTower(material: CANNON.Material) {
        const blockLength = 6;
        const blockHeight = 1;
        const blockWidth = 1.5;
        const blockOffset = 2;

        // Cannon uses half-extents
        const shape = new CANNON.Box(new CANNON.Vec3(blockLength / 2, blockHeight / 2, blockWidth / 2));

        for (let i = 0; i < 16; i++) {
            for (let j = 0; j < 3; j++) {
                const body = new CANNON.Body({
                    mass: 1, // Dynamic
                    material: material
                });
                body.addShape(shape);

                const y = (blockHeight / 2) + blockHeight * i;
                let x = 0;
                let z = 0;

                if (i % 2 === 0) {
                    // Rotate 90 degrees around Y
                    const q = new CANNON.Quaternion();
                    q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2.01);
                    body.quaternion = q;
                    x = blockOffset * j - (blockOffset * 3 / 2 - blockOffset / 2);
                } else {
                    z = blockOffset * j - (blockOffset * 3 / 2 - blockOffset / 2);
                }

                body.position.set(x, y, z);

                // Damping to improve stability
                body.linearDamping = 0.05;
                body.angularDamping = 0.05;

                this.world.addBody(body);
                this.blocks.push(body);
            }
        }
    }

    public step(dt: number) {
        this.world.step(dt);
    }

    public getState() {
        return this.blocks.map(b => ({
            position: { x: b.position.x, y: b.position.y, z: b.position.z },
            quaternion: { x: b.quaternion.x, y: b.quaternion.y, z: b.quaternion.z, w: b.quaternion.w },
            velocity: { x: b.velocity.x, y: b.velocity.y, z: b.velocity.z }
        }));
    }

    public applyForce(blockIndex: number, force: { x: number, y: number, z: number }, point: { x: number, y: number, z: number }) {
        if (blockIndex >= 0 && blockIndex < this.blocks.length) {
            const body = this.blocks[blockIndex];
            body.applyImpulse(
                new CANNON.Vec3(force.x, force.y, force.z),
                new CANNON.Vec3(point.x, point.y, point.z)
            );

            // Wake up all blocks
            this.blocks.forEach(b => b.wakeUp());
        }
    }

    public checkCollapse(threshold: number = 0.4): boolean {
        let fallen = 0;
        const total = this.blocks.length;

        for (const block of this.blocks) {
            if (block.position.y < 0.5) {
                fallen++;
            }
        }

        return (fallen / total) >= threshold;
    }
}
