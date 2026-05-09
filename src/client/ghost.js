import * as THREE from "three";

const GHOST_SPEED  = 0.045; // world units per frame (~half player walk speed)
const CATCH_RADIUS = 0.7;   // distance that triggers a catch
const PATH_REFRESH = 45;    // frames between BFS recalculations per ghost

// ── Ghost class ───────────────────────────────────────────────────────────────

export class Ghost {
  constructor(x, z) {
    this._phase = Math.random() * Math.PI * 2; // random bobbing offset
    this._timer = Math.floor(Math.random() * PATH_REFRESH); // stagger first BFS
    this.path   = [];
    this.mesh   = _buildMesh();
    this.mesh.position.set(x, 0.7, z);
  }

  update(mazeData, cellSize, playerPos, playerVisible = true) {
    // Recompute path periodically, but only when the player is visible
    this._timer++;
    if (this._timer >= PATH_REFRESH) {
      this._timer = 0;
      if (playerVisible) {
        this.path = _bfsPath(this.mesh.position, playerPos, mazeData, cellSize);
      }
    }

    // Follow next waypoint
    if (this.path.length > 0) {
      const wp = this.path[0];
      const dx = wp.x - this.mesh.position.x;
      const dz = wp.z - this.mesh.position.z;
      const d  = Math.sqrt(dx * dx + dz * dz);

      if (d < GHOST_SPEED * 2) {
        this.path.shift(); // waypoint reached, advance
      } else {
        this.mesh.position.x += (dx / d) * GHOST_SPEED;
        this.mesh.position.z += (dz / d) * GHOST_SPEED;
        this.mesh.rotation.y  = Math.atan2(dx, dz);
      }
    }

    // Smooth vertical bobbing
    this.mesh.position.y = 0.7 + Math.sin(Date.now() * 0.003 + this._phase) * 0.18;
  }

  catches(playerPos) {
    const dx = this.mesh.position.x - playerPos.x;
    const dz = this.mesh.position.z - playerPos.z;
    return Math.sqrt(dx * dx + dz * dz) < CATCH_RADIUS;
  }
}

// ── Mesh builder ──────────────────────────────────────────────────────────────

function _buildMesh() {
  const group    = new THREE.Group();
  const bodyMat  = new THREE.MeshBasicMaterial({ color: 0xc8e8ff, transparent: true, opacity: 0.85 });
  const eyeMat   = new THREE.MeshBasicMaterial({ color: 0x112244 });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Main body (slightly tall sphere)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), bodyMat);
  body.scale.y = 1.15;
  group.add(body);

  // Three bottom bumps (classic ghost silhouette)
  for (let i = 0; i < 3; i++) {
    const a    = (i / 3) * Math.PI * 2;
    const bump = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), bodyMat);
    bump.position.set(Math.cos(a) * 0.22, -0.44, Math.sin(a) * 0.22);
    group.add(bump);
  }

  // Eyes + pupils (face toward local +Z)
  for (const ex of [-0.14, 0.14]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), eyeMat);
    eye.position.set(ex, 0.12, 0.34);
    group.add(eye);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), pupilMat);
    pupil.position.set(ex, 0.12, 0.41);
    group.add(pupil);
  }

  return group;
}

// ── BFS pathfinding ───────────────────────────────────────────────────────────

function _worldToCell(wx, wz, mazeData, cs) {
  const rows = mazeData.length, cols = mazeData[0].length;
  return {
    row: Math.max(0, Math.min(rows - 1, Math.round((wz + (rows / 2) * cs - cs / 2) / cs))),
    col: Math.max(0, Math.min(cols - 1, Math.round((wx + (cols / 2) * cs - cs / 2) / cs))),
  };
}

function _cellToWorld(row, col, mazeData, cs) {
  return {
    x: col * cs - (mazeData[0].length / 2) * cs + cs / 2,
    z: row * cs - (mazeData.length  / 2) * cs + cs / 2,
  };
}

function _bfsPath(fromPos, toPos, mazeData, cs) {
  const start = _worldToCell(fromPos.x, fromPos.z, mazeData, cs);
  const goal  = _worldToCell(toPos.x,   toPos.z,   mazeData, cs);
  const rows  = mazeData.length, cols = mazeData[0].length;

  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const parent  = Array.from({ length: rows }, () => Array(cols).fill(null));
  const queue   = [start];
  visited[start.row][start.col] = true;

  let found = false;
  outer: while (queue.length) {
    const cur = queue.shift();
    for (const [dr, dc] of [[0,1],[1,0],[0,-1],[-1,0]]) {
      const nr = cur.row + dr, nc = cur.col + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (visited[nr][nc] || mazeData[nr][nc] === 1) continue; // walls block ghosts
      visited[nr][nc] = true;
      parent[nr][nc]  = cur;
      if (nr === goal.row && nc === goal.col) { found = true; break outer; }
      queue.push({ row: nr, col: nc });
    }
  }

  if (!found) return [];

  // Reconstruct path from goal back to start
  const path = [];
  let cur = goal;
  while (cur.row !== start.row || cur.col !== start.col) {
    path.unshift(_cellToWorld(cur.row, cur.col, mazeData, cs));
    cur = parent[cur.row][cur.col];
    if (!cur) return [];
  }
  return path;
}

// ── Spawn helper ──────────────────────────────────────────────────────────────

export function spawnGhosts(scene, mazeData, cellSize) {
  const rows = mazeData.length, cols = mazeData[0].length;

  // Spawn order: entrance-area first (easy to test), then far corners.
  // Ghost count is read from localStorage (set from the map preview UI).
  const count = Math.min(4, Math.max(1, parseInt(localStorage.getItem('ghostCount') || '3', 10)));

  const corners = [
    [3,         3        ],  // near entrance — always first for testing
    [rows - 4,  cols - 4 ],  // far bottom-right
    [rows - 4,  4        ],  // far bottom-left
    [4,         cols - 4 ],  // far top-right
  ];

  return corners.slice(0, count).map(([r, c]) => {
    const [or, oc] = _findOpen(mazeData, r, c);
    const { x, z } = _cellToWorld(or, oc, mazeData, cellSize);
    const ghost = new Ghost(x, z);
    scene.add(ghost.mesh);
    return ghost;
  });
}

function _findOpen(data, r, c) {
  const rows = data.length, cols = data[0].length;
  for (let radius = 0; radius < 10; radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && data[nr][nc] === 0)
          return [nr, nc];
      }
    }
  }
  return [r, c];
}
