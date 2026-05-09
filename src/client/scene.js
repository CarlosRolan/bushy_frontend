import * as THREE from "three";
import { Player, enemies, p } from "./player.js";
import { playerCamera } from "./camera.js";
import { maze } from "./maze.js";
import { ground } from "./ground.js";
import { star, rotateStar } from "./start.js";
import {
  mouseEvents,
  keyEvents,
  calculateNewPos,
  playerRotation,
  cameraRotation,
  onKey,
  isPlayerWalking,
  isShiftPressed,
  wasSpaceJustPressed,
  wasEJustPressed,
} from "./controls.js";
import { renderer } from "./renderer.js";
import { sendPosition, win, getConnectionStatus } from "./client.js";
import { listener, mazeCollisionSound, walkSound, winningSound } from "./audioLoader.js";
import { ambient, dirlight } from "./lights.js";
import { updateInfoPanel } from "./ui.js";
import { initAnimationPipeline, loadDefaultModel } from "./animationPipeline.js";
import {
  spawnPickups, PlacedSpring, PlacedLadder,
  PICKUP_RADIUS, SPRING_RADIUS, LADDER_RADIUS, BLOCK_TOP_Y,
  ITEM_META,
} from "./items.js";
import { updateItemBox } from "./ui.js";
import { spawnGhosts } from "./ghost.js";

const { boundries } = ground;
const { minX, maxX, minZ, maxZ } = boundries;

const { mazeData, cellSize } = maze;
const halfCellSize = cellSize / 2;

const scene = new THREE.Scene();
const clock = new THREE.Clock();


let spectacting = false;

// Max simultaneous players — must match the backend server limit
const MAX_PLAYERS = 4;

// Movement speeds
const WALK_SPEED      = 0.08;
const RUN_SPEED       = 0.16;
const BUSH_WALK_SPEED = 0.02;
const BUSH_RUN_SPEED  = 0.04;

// Jump physics
const JUMP_FORCE = 0.15;  // initial upward velocity
const GRAVITY    = 0.008; // subtracted from vertical velocity each frame
const FLY_SPEED  = 0.12;  // vertical speed while in debug fly mode
let verticalVelocity = 0;
let isGrounded = true;

// Item system
let pickups      = [];   // ItemPickup[] scattered on the map
let placedSprings = [];  // PlacedSpring[] deployed by the player
let placedLadders = [];  // PlacedLadder[] deployed by the player
let heldItem     = null; // 'spring' | 'ladder' | null
let pickupTime   = 0;    // drives pickup animation
let debugMode = false;
const debugBoxHelpers = [];

// Ghost enemies
let ghosts   = [];
let gameOver = false;
let invincible = false;

// Player respawn position (entrance of the maze)
const SPAWN_X = 1 * cellSize - mazeData[0].length / 2 * cellSize + halfCellSize;
const SPAWN_Z = 0 * cellSize - mazeData.length  / 2 * cellSize + halfCellSize;

function initDebugHelpers() {
  maze.mazeBoundingBoxes.forEach(bb => {
    const color  = bb.type === 'wall' ? 0xff4444 : 0x44ff44;
    const helper = new THREE.Box3Helper(bb, color);
    helper.visible = false;
    scene.add(helper);
    debugBoxHelpers.push(helper);
  });
}

function toggleDebug() {
  debugMode = !debugMode;
  debugBoxHelpers.forEach(h => h.visible = debugMode);
  p.setDebugVisible(debugMode);
  document.getElementById('debugPanel').style.display = debugMode ? 'block' : 'none';
  // Exiting fly mode: drop from current height with clean velocity
  if (!debugMode) {
    verticalVelocity = 0;
    isGrounded = false;
  }
}

window.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'g') toggleDebug();
});
// ======================================================

const [starX, starY] = findValidPosition(mazeData);
// Position the start at the middle
star.position.set(starX * cellSize - mazeData[0].length / 2 * cellSize + halfCellSize, 1, starY * cellSize - mazeData.length / 2 * cellSize + halfCellSize);
// Position the player at the entrance
p.mesh.position.set(1 * cellSize - mazeData[0].length / 2 * cellSize + halfCellSize, 0, 0 * cellSize - mazeData.length / 2 * cellSize + halfCellSize);

//playerCamera.add(listener);

scene.add(maze, p.mesh, ground, star, dirlight, ambient);
initDebugHelpers();
pickups = spawnPickups(scene, mazeData, cellSize);
ghosts  = spawnGhosts(scene, mazeData, cellSize);

// Auto-load the default soldier model on startup
loadDefaultModel('res/data/Soldier.glb').then((modelResult) => {
  p.setModel(modelResult);
});

// Upload panel lets the user swap in their own model at any time
initAnimationPipeline((modelResult) => {
  p.setModel(modelResult);
});

// FPS tracking
let _fps = 0, _fpsCount = 0, _fpsLast = performance.now();
function trackFPS() {
  _fpsCount++;
  const now = performance.now();
  if (now - _fpsLast >= 1000) {
    _fps = _fpsCount;
    _fpsCount = 0;
    _fpsLast = now;
  }
}

// Main render method
function animate() {
  requestAnimationFrame(animate);
  trackFPS();
  updateScene();
  onKey("X", spectate);
  if (!gameOver) {
    updatePlayer();
    updateItems();
  }
  updateGhosts();
  if (debugMode) updateDebugPanel();
  renderer.render(scene, playerCamera);
}

function updateDebugPanel() {
  const pos = p.getCurrentPos();
  document.getElementById('dbgConnection').textContent = `Connection: ${getConnectionStatus()}`;
  document.getElementById('dbgPlayers').textContent    = `Players: ${enemies.size + 1}/${MAX_PLAYERS}`;
  document.getElementById('dbgFPS').textContent        = `FPS: ${_fps}`;
  document.getElementById('dbgPos').textContent        = `Pos: ${r(pos.x)} / ${r(pos.y)} / ${r(pos.z)}`;
}
function r(n) { return Math.round(n * 10) / 10; }

function spectate() {
  spectacting = true;
  playerCamera.position.set(0, 100, 0);
  //playerCamera.lookAt(star);
}

function _playerInBush() {
  const rows = mazeData.length, cols = mazeData[0].length;
  const row = Math.max(0, Math.min(rows - 1, Math.round((p.mesh.position.z + (rows / 2) * cellSize - cellSize / 2) / cellSize)));
  const col = Math.max(0, Math.min(cols - 1, Math.round((p.mesh.position.x + (cols / 2) * cellSize - cellSize / 2) / cellSize)));
  return mazeData[row][col] === 2;
}

function updateGhosts() {
  const pPos    = p.mesh.position;
  const visible = !gameOver && !_playerInBush();
  for (const ghost of ghosts) {
    ghost.update(mazeData, cellSize, pPos, visible);
    if (!gameOver && !invincible && ghost.catches(pPos)) triggerGameOver();
  }
}

function triggerGameOver() {
  gameOver = true;

  const overlay = document.getElementById('blackOverlay');
  const endMsg  = document.getElementById('endMsg');

  endMsg.style.color   = '#b8aaff';
  endMsg.innerHTML     = 'CAUGHT!<br><span style="font-size:0.4em;color:#ccc;font-family:monospace">Respawning in 3s…</span>';
  endMsg.style.display = 'block';
  overlay.style.opacity = '1';

  setTimeout(() => {
    overlay.style.opacity = '0';
    endMsg.style.display  = 'none';

    // Respawn player at entrance
    p.mesh.position.set(SPAWN_X, 0, SPAWN_Z);
    verticalVelocity = 0;
    isGrounded       = true;
    gameOver         = false;
    invincible       = true;
    setTimeout(() => { invincible = false; }, 2000);
  }, 3000);
}

// ======== UPDATE METHODS =====/
function updateScene() {
  rotateStar();
}
function updatePlayer() {
  const deltaTime = clock.getDelta();
  const currentPosition = p.mesh.position.clone();

  // Base speed depends on shift key
  const shift = isShiftPressed();
  p.speed = shift ? RUN_SPEED : WALK_SPEED;

  // XZ movement
  let newPos = calculateNewPos(p.mesh.position, p.speed);
  newPos = checkPlayerBoundary(newPos);
  const movingXZ = Math.abs(newPos.x - currentPosition.x) > 0.0001 ||
                   Math.abs(newPos.z - currentPosition.z) > 0.0001;

  // Capture grounded state before this frame's physics resets it
  const wasGrounded = isGrounded;

  if (debugMode) {
    // ── Fly mode (debug) ─────────────────────────────────────────────────
    // Space = ascend, F = descend. No gravity, no landing checks.
    onKey("Space", () => { newPos.y += FLY_SPEED; });
    onKey("F",     () => { newPos.y -= FLY_SPEED; });
    isGrounded = false;
  } else {
    // ── Normal physics ────────────────────────────────────────────────────
    // Jump
    if (wasGrounded && wasSpaceJustPressed()) {
      verticalVelocity = JUMP_FORCE;
    }

    // Gravity always acts — edge-fall is handled implicitly:
    // if there's no surface under the player after XZ movement the
    // block-top check simply won't match and isGrounded stays false.
    verticalVelocity -= GRAVITY;
    newPos.y += verticalVelocity;
    isGrounded = false; // will be re-set by collision resolution below

    // Land on world ground (y = 0)
    if (newPos.y <= 0) {
      newPos.y = 0;
      verticalVelocity = 0;
      isGrounded = true;
    }

    // Land on top of maze blocks
    if (!isGrounded) {
      handleBlockTopLanding(currentPosition.y, newPos);
    }
  }

  // Animation state based on XZ movement + shift
  const movState = !movingXZ ? 'idle' : (shift ? 'run' : 'walk');
  p.setMovementState(movState);
  p.updateAnimation(deltaTime);

  // Always apply position (gravity needs to update Y even when standing still)
  p.move(newPos.x, newPos.y, newPos.z);

  if (movingXZ) {
    const dx = newPos.x - currentPosition.x;
    const dz = newPos.z - currentPosition.z;
    if (dx !== 0 || dz !== 0) p.rotate(Math.atan2(dx, dz));

    handleMazeCollisions();
    handleSimplePlayerCollisions(p);
    handlePlayerStarCollision(p);

    if (!walkSound.isPlaying) walkSound.play();
    updateInfoPanel(newPos, playerRotation);
    sendPosition({ id: p.id, position: p.mesh.position, rotation: p.mesh.rotation.y });
  } else {
    if (walkSound.isPlaying) walkSound.stop();
  }

  updatePlayerCamera();
}
function updatePlayerCamera() {
  if (!spectacting) {
    const target = new THREE.Vector3(
      p.mesh.position.x - 5 * Math.sin(cameraRotation),
      playerCamera.position.y,
      p.mesh.position.z - 5 * Math.cos(cameraRotation)
    );

    // Smooth follow (no hard snap)
    playerCamera.position.lerp(target, 0.2);
    playerCamera.lookAt(p.mesh.position);
  } else {
    playerCamera.lookAt(star.position);
  }
}

function updateEnemies(enemies) {
  enemies.forEach(enemy => scene.add(enemy.mesh));
}
function addEnemy(enemyId) {
  enemies.forEach(e => {
    if (e.id == p.id) {
      console.log("THAT IS YOU");
      return;
    }
    if (e.id === enemyId) {
      console.log("Enemy already exists");
      return;
    }
  });
  const newEnemy = new Player(enemyId);
  enemies.add(newEnemy);
  scene.add(newEnemy.mesh); // Add the enemy to the scene
}
function deleteEnemy(enemyId) {
  enemies.forEach(e => {
    if (e.id === enemyId) {
      enemies.delete(e);
      scene.remove(e.mesh); // Remove the enemy from the scene
    }
  });
}

//======================[COLLISIONS]=======================/
function checkPlayerBoundary(position) {
  if (position.x < minX) {
    position.x = minX;
  } else if (position.x > maxX) {
    position.x = maxX;
  }

  if (position.z < minZ) {
    position.z = minZ;
  } else if (position.z > maxZ) {
    position.z = maxZ;
  }

  return position;
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function applyCorrectionSmoothly2(position, correctionVector, deltaTime) {
  const smoothingFactor = 0.1; // Adjust this value to control the smoothing effect
  position.x = lerp(position.x, position.x + correctionVector.x, smoothingFactor * deltaTime);
  position.y = lerp(position.y, position.y + correctionVector.y, smoothingFactor * deltaTime);
  position.z = lerp(position.z, position.z + correctionVector.z, smoothingFactor * deltaTime);
}

function applyWallCorrection(position, correctionVector) {
  // Small separation to avoid re-intersection by float precision
  const EPS = 0.001;

  if (correctionVector.x !== 0) position.x += correctionVector.x + Math.sign(correctionVector.x) * EPS;
  if (correctionVector.y !== 0) position.y += correctionVector.y + Math.sign(correctionVector.y) * EPS;
  if (correctionVector.z !== 0) position.z += correctionVector.z + Math.sign(correctionVector.z) * EPS;
}

function applyCorrectionSmoothly(position, correctionVector, deltaTime) {
  const smoothingFactor = 100; // Adjust this value to control the smoothing effect
  const smoothedCorrection = new THREE.Vector3().copy(correctionVector).multiplyScalar(smoothingFactor * deltaTime);
  position.add(smoothedCorrection);
}

// ========================= ITEM SYSTEM ==============================

function updateItems() {
  pickupTime += 0.03;
  const px = p.mesh.position.x;
  const pz = p.mesh.position.z;

  // Animate and collect pickups
  for (const pickup of pickups) {
    if (!pickup.active) continue;
    pickup.animate(pickupTime);

    const dx = px - pickup.mesh.position.x;
    const dz = pz - pickup.mesh.position.z;
    if (dx * dx + dz * dz < PICKUP_RADIUS * PICKUP_RADIUS && heldItem === null) {
      pickup.collect();
      heldItem = pickup.type;
      updateItemBox(heldItem);
    }
  }

  // Update placed springs (cooldown) and check trigger
  for (const spring of placedSprings) {
    if (!spring.active) continue;
    spring.update();
    if (spring.cooldown > 0) continue; // immunity period

    const dx = px - spring.mesh.position.x;
    const dz = pz - spring.mesh.position.z;
    if (dx * dx + dz * dz < SPRING_RADIUS * SPRING_RADIUS && isGrounded) {
      // Launch player upward
      verticalVelocity = JUMP_FORCE * 3.5;
      isGrounded = false;
      spring.trigger();
    }
  }

  // Check placed ladders — elevate player to block top when touched at ground level
  for (const ladder of placedLadders) {
    if (!ladder.active) continue;
    const dx = px - ladder.mesh.position.x;
    const dz = pz - ladder.mesh.position.z;
    if (dx * dx + dz * dz < LADDER_RADIUS * LADDER_RADIUS && p.mesh.position.y < 0.5) {
      p.mesh.position.y = BLOCK_TOP_Y;
      verticalVelocity  = 0;
      isGrounded        = true;
    }
  }

  // Use item (press E)
  if (wasEJustPressed() && heldItem !== null) {
    useItem();
  }
}

function useItem() {
  const x = p.mesh.position.x;
  const z = p.mesh.position.z;

  if (heldItem === 'spring') {
    const spring = new PlacedSpring(x, z);
    scene.add(spring.mesh);
    placedSprings.push(spring);

  } else if (heldItem === 'ladder') {
    // Orient the ladder toward the nearest wall in the player's facing direction
    const facingX = Math.sin(p.mesh.rotation.y);
    const facingZ = Math.cos(p.mesh.rotation.y);
    const rotY    = Math.atan2(facingX, facingZ);
    const ladder  = new PlacedLadder(
      x + facingX * 0.6,
      z + facingZ * 0.6,
      rotY
    );
    scene.add(ladder.mesh);
    placedLadders.push(ladder);
  }

  heldItem = null;
  updateItemBox(null);
}

// ====================================================================

// Y collision: detect when the player passes through the top face of a block.
// prevY = player's Y at the START of this frame (before gravity was applied).
// newPos = where the player will be after this frame's physics.
//
// The check  prevY >= bb.max.y && newPos.y <= bb.max.y  means:
//   "the player was at or above the block top, and is now at or below it"
// which covers both:
//   - falling onto a block from above
//   - standing on a block (gravity pulls newPos.y slightly below bb.max.y
//     every frame; this check snaps it back and keeps isGrounded = true)
//
// Edge-fall is implicit: once the player moves their XZ position off the
// block, the XZ circle check fails → the block-top check is skipped →
// isGrounded stays false → the player starts falling.
function handleBlockTopLanding(prevY, newPos) {
  const cx = newPos.x;
  const cz = newPos.z;

  for (const bb of maze.mazeBoundingBoxes) {
    if (bb.type !== 'wall') continue;

    // Is the player's circle over this block in XZ?
    const closestX = Math.max(bb.min.x, Math.min(cx, bb.max.x));
    const closestZ = Math.max(bb.min.z, Math.min(cz, bb.max.z));
    const dx = cx - closestX;
    const dz = cz - closestZ;
    if (dx * dx + dz * dz >= PLAYER_RADIUS * PLAYER_RADIUS) continue;

    // Did the player pass through (or sit on) this block's top face?
    if (prevY >= bb.max.y && newPos.y <= bb.max.y) {
      newPos.y       = bb.max.y;
      verticalVelocity = 0;
      isGrounded     = true;
      return; // one block at a time is enough
    }
  }
}

// Circle-vs-AABB collision in XZ.
// Instead of box-vs-box (which mis-picks the push axis at corners),
// we treat the player as a circle of radius PLAYER_RADIUS in XZ.
// For each maze cell we find the closest point on the cell's AABB to the
// player centre, then push the player straight out from that point.
// This naturally slides around corners without teleporting.
const PLAYER_RADIUS = 0.25;

function handleMazeCollisions() {
  let bushCollisionDetected = false;

  const cx = p.mesh.position.x;
  const cz = p.mesh.position.z;

  for (const mazeBB of maze.mazeBoundingBoxes) {

    // Skip if the player is fully above or below this block
    const playerBottom = p.mesh.position.y;
    const playerTop    = playerBottom + 1.5;
    if (playerBottom >= mazeBB.max.y || playerTop <= mazeBB.min.y) continue;

    // Closest point on the AABB (XZ only) to the player centre
    const closestX = Math.max(mazeBB.min.x, Math.min(cx, mazeBB.max.x));
    const closestZ = Math.max(mazeBB.min.z, Math.min(cz, mazeBB.max.z));
    const dx = cx - closestX;
    const dz = cz - closestZ;
    const dist2 = dx * dx + dz * dz;

    if (dist2 >= PLAYER_RADIUS * PLAYER_RADIUS) continue;

    switch (mazeBB.type) {

      case 'bush':
        bushCollisionDetected = true;
        if (!mazeCollisionSound.isPlaying && isPlayerWalking()) {
          mazeCollisionSound.play();
        }
        p.speed = isShiftPressed() ? BUSH_RUN_SPEED : BUSH_WALK_SPEED;
        break;

      case 'wall':
        if (dist2 === 0) {
          // Centre is exactly on the box edge — push out along shortest XZ axis
          const ox = Math.min(cx - mazeBB.min.x, mazeBB.max.x - cx);
          const oz = Math.min(cz - mazeBB.min.z, mazeBB.max.z - cz);
          if (ox < oz) {
            p.mesh.position.x += cx < (mazeBB.min.x + mazeBB.max.x) / 2 ? -(ox + PLAYER_RADIUS) : (ox + PLAYER_RADIUS);
          } else {
            p.mesh.position.z += cz < (mazeBB.min.z + mazeBB.max.z) / 2 ? -(oz + PLAYER_RADIUS) : (oz + PLAYER_RADIUS);
          }
        } else {
          // Normal case: push player out along the closest-point direction
          const dist = Math.sqrt(dist2);
          const overlap = PLAYER_RADIUS - dist;
          p.mesh.position.x += (dx / dist) * overlap;
          p.mesh.position.z += (dz / dist) * overlap;
        }
        break;
    }
  }

  if (!bushCollisionDetected) {
    p.speed = isShiftPressed() ? RUN_SPEED : WALK_SPEED;
    if (mazeCollisionSound.isPlaying) mazeCollisionSound.stop();
  }
}

function handleSimplePlayerCollisions(player) {
  const playerBoundingBox = new THREE.Box3().setFromObject(player.mesh.getObjectByName("collider"));
  enemies.forEach(enemy => {
    const enemyBoundingBox = new THREE.Box3().setFromObject(enemy.mesh);
    if (playerBoundingBox.intersectsBox(enemyBoundingBox)) {
      const overlap = {
        x: Math.min(playerBoundingBox.max.x - enemyBoundingBox.min.x, enemyBoundingBox.max.x - playerBoundingBox.min.x),
        y: Math.min(playerBoundingBox.max.y - enemyBoundingBox.min.y, enemyBoundingBox.max.y - playerBoundingBox.min.y),
        z: Math.min(playerBoundingBox.max.z - enemyBoundingBox.min.z, enemyBoundingBox.max.z - playerBoundingBox.min.z),
      };

      if (overlap.x < overlap.y && overlap.x < overlap.z) {
        player.mesh.position.x += playerBoundingBox.min.x < enemyBoundingBox.min.x ? -overlap.x : overlap.x;
      } else if (overlap.y < overlap.x && overlap.y < overlap.z) {
        player.mesh.position.y += playerBoundingBox.min.y < enemyBoundingBox.min.y ? -overlap.y : overlap.y;
      } else {
        player.mesh.position.z += playerBoundingBox.min.z < enemyBoundingBox.min.z ? -overlap.z : overlap.z;
      }

      playerBoundingBox.setFromObject(player.mesh);
      return
    }
  });
}

function handlePlayerStarCollision(player) {
  const playerBoundingBox = new THREE.Box3().setFromObject(player.mesh);
  star.geometry.computeBoundingBox();
  const startBoundingBox = new THREE.Box3().setFromObject(star);

  if (playerBoundingBox.intersectsBox(startBoundingBox)) {
    win(player);
    winningSound.play();
    scene.remove(maze, player, ground);
    return;
  }
}
// Function to find a valid position in the maze
function findValidPosition() {
  const height = mazeData.length;
  const width = mazeData[0].length;
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  if (mazeData[centerY][centerX] === 0) {
    return [centerX, centerY];
  }

  // Find the nearest open cell to the center
  const directions = [
    [0, 1], [1, 0], [0, -1], [-1, 0]
  ];
  for (let radius = 1; radius < Math.max(width, height); radius++) {
    for (let [dx, dy] of directions) {
      let nx = centerX + dx * radius;
      let ny = centerY + dy * radius;
      if (nx >= 0 && ny >= 0 && nx < width && ny < height && mazeData[ny][nx] === 0) {
        return [nx, ny];
      }
    }
  }
  return [centerX, centerY]; // Fallback
}

window.addEventListener("mousedown", mouseEvents.onMouseDown, true);
window.addEventListener("mouseup", mouseEvents.onMouseUp, false);
window.addEventListener("mousemove", mouseEvents.onMouseMove, true);
window.addEventListener("keydown", keyEvents.onKeyDown, false);
window.addEventListener("keyup", keyEvents.onKeyUp, false);

document.getElementById("canvas").appendChild(renderer.domElement);

export { animate, updateEnemies, deleteEnemy, addEnemy, spectate };