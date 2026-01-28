import * as THREE from 'three';

export class World {
  scene: THREE.Scene;
  terrain!: THREE.Mesh;
  terrainSize = 200;
  terrainSegments = 100;
  heightData: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.heightData = new Float32Array((this.terrainSegments + 1) ** 2);

    this.createSky();
    this.createTerrain();
    this.createWater();
    this.createTrees();
    this.createRocks();
    this.createAmbience();
  }

  // Deterministic noise function
  noise(x: number, z: number): number {
    const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  // Calculate height at any world position (deterministic)
  calculateHeight(x: number, z: number): number {
    let height = 0;
    height += Math.sin(x * 0.02) * Math.cos(z * 0.02) * 5;
    height += Math.sin(x * 0.05 + 1) * Math.cos(z * 0.05 + 2) * 2;
    height += Math.sin(x * 0.1 + 3) * Math.cos(z * 0.1 + 4) * 1;
    height += (this.noise(x * 0.5, z * 0.5) - 0.5) * 0.5;
    return height;
  }

  createSky() {
    // Bright blue sky
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 80, 200);
  }

  createTerrain() {
    const geometry = new THREE.PlaneGeometry(
      this.terrainSize,
      this.terrainSize,
      this.terrainSegments,
      this.terrainSegments
    );

    const vertices = geometry.attributes.position.array as Float32Array;

    // Build height data grid
    for (let iz = 0; iz <= this.terrainSegments; iz++) {
      for (let ix = 0; ix <= this.terrainSegments; ix++) {
        const worldX = (ix / this.terrainSegments - 0.5) * this.terrainSize;
        const worldZ = (iz / this.terrainSegments - 0.5) * this.terrainSize;
        const height = this.calculateHeight(worldX, worldZ);
        this.heightData[iz * (this.terrainSegments + 1) + ix] = height;
      }
    }

    // Apply heights to mesh vertices
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      vertices[i + 2] = this.calculateHeight(x, y);
    }

    geometry.computeVertexNormals();

    // Green grass terrain
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a7c3f,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true,
    });

    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.rotation.x = -Math.PI / 2;
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }

  createWater() {
    const geometry = new THREE.PlaneGeometry(this.terrainSize * 2, this.terrainSize * 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a90d9,
      transparent: true,
      opacity: 0.8,
      roughness: 0.1,
      metalness: 0.3,
    });

    const water = new THREE.Mesh(geometry, material);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -2;
    this.scene.add(water);
  }

  createTrees() {
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 3, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

    const canopyGeometry = new THREE.ConeGeometry(1.5, 4, 6);
    const canopyMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });

    for (let i = 0; i < 50; i++) {
      const x = (this.noise(i * 0.1, i * 0.2) - 0.5) * this.terrainSize * 0.8;
      const z = (this.noise(i * 0.3, i * 0.4) - 0.5) * this.terrainSize * 0.8;
      const y = this.getTerrainHeight(x, z);

      if (y > 0) {
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(x, y + 1.5, z);
        trunk.castShadow = true;
        this.scene.add(trunk);

        const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
        canopy.position.set(x, y + 5, z);
        canopy.castShadow = true;
        this.scene.add(canopy);
      }
    }
  }

  createRocks() {
    const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.9,
      flatShading: true,
    });

    for (let i = 0; i < 30; i++) {
      const x = (this.noise(i * 0.5, i * 0.6) - 0.5) * this.terrainSize * 0.8;
      const z = (this.noise(i * 0.7, i * 0.8) - 0.5) * this.terrainSize * 0.8;
      const y = this.getTerrainHeight(x, z);

      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      const scale = 0.5 + this.noise(i, i) * 1.5;
      rock.scale.set(scale, scale * 0.6, scale);
      rock.position.set(x, y + scale * 0.3, z);
      rock.rotation.set(
        this.noise(i * 1.1, 0) * Math.PI,
        this.noise(i * 1.2, 0) * Math.PI,
        this.noise(i * 1.3, 0) * Math.PI
      );
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }
  }

  createAmbience() {
    // Bright sun
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    this.scene.add(sunLight);

    // Brighter ambient
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Hemisphere light - blue sky, green ground
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a7c3f, 0.4);
    this.scene.add(hemiLight);
  }

  getTerrainHeight(x: number, z: number): number {
    const halfSize = this.terrainSize / 2;

    const clampedX = Math.max(-halfSize, Math.min(halfSize, x));
    const clampedZ = Math.max(-halfSize, Math.min(halfSize, z));

    const normalizedX = (clampedX + halfSize) / this.terrainSize;
    const normalizedZ = (clampedZ + halfSize) / this.terrainSize;

    const ix = normalizedX * this.terrainSegments;
    const iz = normalizedZ * this.terrainSegments;

    const x0 = Math.max(0, Math.min(this.terrainSegments - 1, Math.floor(ix)));
    const z0 = Math.max(0, Math.min(this.terrainSegments - 1, Math.floor(iz)));
    const x1 = Math.min(x0 + 1, this.terrainSegments);
    const z1 = Math.min(z0 + 1, this.terrainSegments);

    const fx = ix - x0;
    const fz = iz - z0;

    const h00 = this.heightData[z0 * (this.terrainSegments + 1) + x0];
    const h10 = this.heightData[z0 * (this.terrainSegments + 1) + x1];
    const h01 = this.heightData[z1 * (this.terrainSegments + 1) + x0];
    const h11 = this.heightData[z1 * (this.terrainSegments + 1) + x1];

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;

    return h0 * (1 - fz) + h1 * fz;
  }
}
