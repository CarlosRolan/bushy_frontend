import * as THREE from "three";

export const PICKUP_RADIUS = 0.65; // auto-collect distance
export const SPRING_RADIUS = 0.85; // spring trigger zone (fills corridor)
export const LADDER_RADIUS = 0.55; // ladder climb trigger zone
export const BLOCK_TOP_Y   = 2.0;  // maze wall height

export const ITEM_META = {
  spring: { icon: '🌀', label: 'Spring',  color: 0x00cc44 },
  ladder: { icon: '🪜', label: 'Ladder',  color: 0x8B4513 },
};

// ─── Pickup ──────────────────────────────────────────────────────────────────
// Small collectible that floats and rotates on the ground.

export class ItemPickup {
  constructor(type, x, z) {
    this.type   = type;
    this.active = true;
    this.mesh   = _buildPickupMesh(type);
    this.mesh.position.set(x, 0.4, z);
  }

  animate(time) {
    if (!this.active) return;
    this.mesh.rotation.y  = time * 1.5;
    this.mesh.position.y  = 0.4 + Math.sin(time * 2) * 0.1;
  }

  collect() {
    this.active       = false;
    this.mesh.visible = false;
  }
}

function _buildPickupMesh(type) {
  const group = new THREE.Group();
  const mat   = new THREE.MeshBasicMaterial({ color: ITEM_META[type].color });

  if (type === 'spring') {
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 6, 14), mat);
      ring.rotation.x  = Math.PI / 2;
      ring.position.y  = i * 0.1;
      group.add(ring);
    }
  } else {
    // ladder
    [-0.18, 0.18].forEach(x => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.06), mat);
      rail.position.set(x, 0.28, 0);
      group.add(rail);
    });
    for (let i = 0; i < 4; i++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.06), mat);
      rung.position.y = 0.06 + i * 0.15;
      group.add(rung);
    }
  }
  return group;
}

// ─── Placed Spring ────────────────────────────────────────────────────────────
// Trap placed by the player. Fills a full 2-unit corridor gap.
// Only visible to the placer (other clients never receive this data).
// Has a placement cooldown so the placer doesn't immediately trigger it.

export class PlacedSpring {
  constructor(x, z) {
    this.active   = true;
    this.cooldown = 80; // immunity frames after placement
    this.mesh     = _buildSpringMesh();
    this.mesh.position.set(x, 0.05, z);
  }

  update() {
    if (this.cooldown > 0) this.cooldown--;
  }

  trigger() {
    this.active       = false;
    this.mesh.visible = false;
  }
}

function _buildSpringMesh() {
  const group = new THREE.Group();
  const mat   = new THREE.MeshBasicMaterial({ color: 0x00ff44 });

  // Base plate — wide enough to fill a 2-unit corridor
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.06, 20), mat);
  base.position.y = 0;
  group.add(base);

  // Coils
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 7, 18), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06 + i * 0.1;
    group.add(ring);
  }

  // Top plate
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.06, 20), mat);
  top.position.y = 0.56;
  group.add(top);

  return group;
}

// ─── Placed Ladder ────────────────────────────────────────────────────────────
// Permanent climbable placed against the nearest wall face.
// Any player who touches it at ground level gets elevated to block top.

export class PlacedLadder {
  constructor(x, z, rotY) {
    this.active = true;
    this.mesh   = _buildLadderMesh();
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = rotY;
  }
}

function _buildLadderMesh() {
  const group = new THREE.Group();
  const mat   = new THREE.MeshBasicMaterial({ color: 0x8B4513 });

  // Side rails (full block height)
  [-0.35, 0.35].forEach(x => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.0, 0.08), mat);
    rail.position.set(x, 1, 0);
    group.add(rail);
  });

  // Rungs
  for (let i = 0; i < 9; i++) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.08), mat);
    rung.position.y = 0.15 + i * 0.22;
    group.add(rung);
  }

  return group;
}

// ─── Spawn random pickups across the maze ─────────────────────────────────────

export function spawnPickups(scene, mazeData, cellSize) {
  const pickups = [];
  const rows    = mazeData.length;
  const cols    = mazeData[0].length;
  const offsetX = (cols / 2) * cellSize;
  const offsetZ = (rows / 2) * cellSize;
  const half    = cellSize / 2;
  const midR    = Math.floor(rows / 2);
  const midC    = Math.floor(cols / 2);

  // Gather open cells, excluding edges, entrances and center plaza
  const open = [];
  for (let r = 4; r < rows - 4; r++) {
    for (let c = 4; c < cols - 4; c++) {
      if (mazeData[r][c] !== 0) continue;
      if (Math.abs(r - midR) <= 4 && Math.abs(c - midC) <= 4) continue;
      open.push([r, c]);
    }
  }

  // Fisher-Yates shuffle
  for (let i = open.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [open[i], open[j]] = [open[j], open[i]];
  }

  const types = ['spring','ladder','spring','ladder','spring','ladder','spring','ladder'];
  const count = Math.min(types.length, open.length);

  for (let i = 0; i < count; i++) {
    const [r, c] = open[i];
    const x      = c * cellSize - offsetX + half;
    const z      = r * cellSize - offsetZ + half;
    const pickup = new ItemPickup(types[i], x, z);
    scene.add(pickup.mesh);
    pickups.push(pickup);
  }

  return pickups;
}
