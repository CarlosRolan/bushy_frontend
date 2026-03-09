import * as THREE from "../../three/build/three.module.js";
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
  isPlayerWalking
} from "./controls.js";
import { renderer } from "./renderer.js";
import { sendPosition, win } from "./client.js";
import { listener, mazeCollisionSound, walkSound, winningSound } from "./audioLoader.js";
import { ambient, dirlight } from "./lights.js";
import { updateInfoPanel } from "./ui.js";

const { boundries } = ground;
const { minX, maxX, minZ, maxZ } = boundries;

const { mazeData, cellSize } = maze;
const halfCellSize = cellSize / 2;

const scene = new THREE.Scene();
const clock = new THREE.Clock();


let spectacting = false;

const [starX, starY] = findValidPosition(mazeData);
// Position the start at the middle
star.position.set(starX * cellSize - mazeData[0].length / 2 * cellSize + halfCellSize, 1, starY * cellSize - mazeData.length / 2 * cellSize + halfCellSize);
// Position the player at the entrance
p.mesh.position.set(1 * cellSize - mazeData[0].length / 2 * cellSize + halfCellSize, 1, 0 * cellSize - mazeData.length / 2 * cellSize + halfCellSize);

//playerCamera.add(listener);

scene.add(maze, p.mesh, ground, star, dirlight, ambient);

// Main render method
function animate() {
  requestAnimationFrame(animate);
  updateScene();
  onKey("X", spectate);

  updatePlayer();

  renderer.render(scene, playerCamera);
}

function spectate() {
  spectacting = true;
  playerCamera.position.set(0, 100, 0);
  //playerCamera.lookAt(star);
}

// ======== UPDATE METHODS =====/
function updateScene() {
  rotateStar();
}
function updatePlayer() {
  const currentPosition = p.mesh.position.clone();

  let newPos = calculateNewPos(p.mesh.position, p.speed);

  // Boundary check to ensure the player stays within the ground limits
  newPos = checkPlayerBoundary(newPos);

  if (!currentPosition.equals(newPos)) {

    p.rotate(playerRotation);

    p.move(newPos.x, newPos.y, newPos.z);

    // Get the delta time
    const deltaTime = clock.getDelta();

    handleMazeCollisions(deltaTime);
    handleSimplePlayerCollisions(p);
    handlePlayerStarCollision(p);

    // Play walking sound
    if (!walkSound.isPlaying) {
      walkSound.play();
    }

    //UI
    updateInfoPanel(newPos, playerRotation);

    sendPosition({ id: p.id, position: p.mesh.position, rotation: p.mesh.rotation.y });
  } else {

    // Play walking sound
    if (walkSound.isPlaying) {
      walkSound.stop();
    }

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

function handleMazeCollisions(deltaTime) {
  let bushCollisionDetected = false;

  p.mesh.updateMatrixWorld(true);
  p.getCollider().updateMatrixWorld(true);
  const playerBoundingBox = new THREE.Box3().setFromObject(p.getCollider());
  let correctionVector = new THREE.Vector3();

  for (const mazeBoundingBox of maze.mazeBoundingBoxes) {
    if (playerBoundingBox.intersectsBox(mazeBoundingBox)) {

      switch (mazeBoundingBox.type) {

        case "bush":
          bushCollisionDetected = true;
          if (!mazeCollisionSound.isPlaying) {
            if (isPlayerWalking()) {
              mazeCollisionSound.play();
            }

          }
          p.speed = 0.02;
          break;

        case "wall":
          const overlap = {
            x: Math.min(playerBoundingBox.max.x - mazeBoundingBox.min.x, mazeBoundingBox.max.x - playerBoundingBox.min.x),
            y: Math.min(playerBoundingBox.max.y - mazeBoundingBox.min.y, mazeBoundingBox.max.y - playerBoundingBox.min.y),
            z: Math.min(playerBoundingBox.max.z - mazeBoundingBox.min.z, mazeBoundingBox.max.z - playerBoundingBox.min.z),
          };

          if (overlap.x < overlap.y && overlap.x < overlap.z) {
            correctionVector.x += playerBoundingBox.min.x < mazeBoundingBox.min.x ? -overlap.x : overlap.x;
          } else if (overlap.y < overlap.x && overlap.y < overlap.z) {
            correctionVector.y += playerBoundingBox.min.y < mazeBoundingBox.min.y ? -overlap.y : overlap.y;
          } else {
            correctionVector.z += playerBoundingBox.min.z < mazeBoundingBox.min.z ? -overlap.z : overlap.z;
          }
          break;

        default:
          break;
      }
    }

  }

  // Apply the correction vector to the player's position
  //p.mesh.position.add(correctionVector.clone().multiplyScalar(deltaTime));
  //applyCorrectionSmoothly(p.mesh.position, correctionVector, deltaTime);
  //COLISION CALCULATOR
  applyWallCorrection(p.mesh.position, correctionVector);
  //p.mesh.position.add(correctionVector);

  if (!bushCollisionDetected) {
    p.speed = 0.1;
    if (mazeCollisionSound.isPlaying) {
      mazeCollisionSound.stop();
    }
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