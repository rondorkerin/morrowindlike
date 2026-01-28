import * as THREE from 'three';

export class World {
  scene: THREE.Scene;
  terrain!: THREE.Mesh;
  terrainSize = 200;
  terrainSegments = 100;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.createSky();
    this.createTerrain();
    this.createWater();
    this.createTrees();
    this.createRocks();
    this.createBed();
    this.createAmbience();
  }

  // Smooth terrain height - no high-frequency noise
  getTerrainHeight(x: number, z: number): number {
    const halfSize = this.terrainSize / 2;
    const clampedX = Math.max(-halfSize, Math.min(halfSize, x));
    const clampedZ = Math.max(-halfSize, Math.min(halfSize, z));

    // Smooth rolling hills only - no noise
    let height = 0;
    height += Math.sin(clampedX * 0.02) * Math.cos(clampedZ * 0.02) * 5;
    height += Math.sin(clampedX * 0.05 + 1) * Math.cos(clampedZ * 0.05 + 2) * 2;
    height += Math.sin(clampedX * 0.1 + 3) * Math.cos(clampedZ * 0.1 + 4) * 1;

    return height;
  }

  createSky() {
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

    for (let i = 0; i < vertices.length; i += 3) {
      const planeX = vertices[i];
      const planeY = vertices[i + 1];
      const worldX = planeX;
      const worldZ = -planeY;
      vertices[i + 2] = this.getTerrainHeight(worldX, worldZ);
    }

    geometry.computeVertexNormals();

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
      const angle = i * 0.618033 * Math.PI * 2;
      const radius = 10 + (i * 3) % 80;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
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
      const angle = i * 0.753 * Math.PI * 2;
      const radius = 5 + (i * 4) % 70;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = this.getTerrainHeight(x, z);

      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      const scale = 0.5 + (i % 5) * 0.3;
      rock.scale.set(scale, scale * 0.6, scale);
      rock.position.set(x, y + scale * 0.3, z);
      rock.rotation.set(i * 0.5, i * 0.7, i * 0.3);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }
  }

  createBed() {
    // Place a bed near spawn for sleeping/leveling
    const bedX = 5;
    const bedZ = 10;
    const bedY = this.getTerrainHeight(bedX, bedZ);

    // Bed frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const frameGeo = new THREE.BoxGeometry(1.2, 0.3, 2.2);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(bedX, bedY + 0.15, bedZ);
    frame.castShadow = true;
    this.scene.add(frame);

    // Mattress
    const mattressMat = new THREE.MeshStandardMaterial({ color: 0xF5DEB3 });
    const mattressGeo = new THREE.BoxGeometry(1, 0.2, 2);
    const mattress = new THREE.Mesh(mattressGeo, mattressMat);
    mattress.position.set(bedX, bedY + 0.4, bedZ);
    mattress.castShadow = true;
    this.scene.add(mattress);

    // Pillow
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    const pillowGeo = new THREE.BoxGeometry(0.8, 0.15, 0.4);
    const pillow = new THREE.Mesh(pillowGeo, pillowMat);
    pillow.position.set(bedX, bedY + 0.55, bedZ - 0.7);
    pillow.castShadow = true;
    this.scene.add(pillow);

    // Blanket
    const blanketMat = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
    const blanketGeo = new THREE.BoxGeometry(1.1, 0.08, 1.4);
    const blanket = new THREE.Mesh(blanketGeo, blanketMat);
    blanket.position.set(bedX, bedY + 0.52, bedZ + 0.2);
    blanket.castShadow = true;
    this.scene.add(blanket);
  }

  getBedPosition(): THREE.Vector3 {
    return new THREE.Vector3(5, this.getTerrainHeight(5, 10), 10);
  }

  createAmbience() {
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a7c3f, 0.4);
    this.scene.add(hemiLight);
  }
}
