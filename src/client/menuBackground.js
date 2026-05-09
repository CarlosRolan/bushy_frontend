import * as THREE from "three";
import { menuCamera, moveCameraAroundMenu } from "./camera.js";
import { maze, rebuildMaze, generateMazeData, createArray } from "./maze.js";
import { ground } from "./ground.js";
import { renderer } from "./renderer.js";

const scene = new THREE.Scene();
scene.add(maze, ground);

// Tracks the maze data currently displayed (starts with the static default)
let currentMazeData = maze.mazeData;

// ── Ghost count (persisted via localStorage) ─────────────────────────────────
const MIN_GHOSTS = 1;
const MAX_GHOSTS = 4;

function _getGhostCount() {
  return Math.min(MAX_GHOSTS, Math.max(MIN_GHOSTS,
    parseInt(localStorage.getItem('ghostCount') || '3', 10)));
}

window.changeGhostCount = function (delta) {
  const next = Math.min(MAX_GHOSTS, Math.max(MIN_GHOSTS, _getGhostCount() + delta));
  localStorage.setItem('ghostCount', String(next));
  document.getElementById('ghost-count-value').textContent = next;
};

// ── Auto-generate new map ────────────────────────────────────────────────────
window.generateNewMap = function () {
  const SIZE = 51;
  const newData = generateMazeData(createArray(SIZE, SIZE));
  rebuildMaze(newData);
  currentMazeData = newData;
};

// ── 2-D top-down preview ─────────────────────────────────────────────────────
window.showMapPreview = function () {
  _drawPreview(currentMazeData);
  document.getElementById('ghost-count-value').textContent = _getGhostCount();
  document.getElementById('map-preview-overlay').style.display = 'flex';
};

window.closeMapPreview = function () {
  document.getElementById('map-preview-overlay').style.display = 'none';
};

function _drawPreview(data) {
  const canvas = document.getElementById('map-preview-canvas');
  const ctx    = canvas.getContext('2d');
  const rows   = data.length;
  const cols   = data[0].length;
  const cell   = Math.floor(Math.min(520 / rows, 520 / cols));
  canvas.width  = cols * cell;
  canvas.height = rows * cell;

  // ── Cells ──────────────────────────────────────────────────────────────────
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = data[r][c];
      ctx.fillStyle = v === 1 ? '#7a3b1e'   // wall  → brick
                    : v === 2 ? '#2d6a2d'   // bush  → dark green
                    :           '#a8d8a8';  // floor → light green
      ctx.fillRect(c * cell, r * cell, cell, cell);
    }
  }

  // ── Grid lines (only when cells are big enough to see them) ────────────────
  if (cell >= 6) {
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth   = 0.5;
    for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * cell); ctx.lineTo(cols * cell, r * cell); ctx.stroke(); }
    for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(c * cell, 0); ctx.lineTo(c * cell, rows * cell); ctx.stroke(); }
  }

  // ── Player spawn (entrance top of maze, col 1) ────────────────────────────
  _drawCircle(ctx, 1, 0, cell, '#00cfff', 'S');

  // ── Star / goal (nearest open cell to center) ─────────────────────────────
  const [sc, sr] = _findCenter(data);
  _drawStar(ctx, sc, sr, cell, '#ffd700');
}

function _findCenter(data) {
  const rows = data.length, cols = data[0].length;
  const cy = Math.floor(rows / 2), cx = Math.floor(cols / 2);
  if (data[cy][cx] === 0) return [cx, cy];
  for (let radius = 1; radius < Math.max(rows, cols); radius++) {
    for (const [dy, dx] of [[0,1],[1,0],[0,-1],[-1,0]]) {
      const ny = cy + dy * radius, nx = cx + dx * radius;
      if (ny >= 0 && ny < rows && nx >= 0 && nx < cols && data[ny][nx] === 0)
        return [nx, ny];
    }
  }
  return [cx, cy];
}

function _drawCircle(ctx, col, row, cell, color, label) {
  const x = col * cell + cell / 2;
  const y = row * cell + cell / 2;
  const r = Math.max(cell * 0.42, 3);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (label && cell >= 8) {
    ctx.fillStyle    = '#000';
    ctx.font         = `bold ${Math.max(7, Math.floor(cell * 0.5))}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
  }
}

function _drawStar(ctx, col, row, cell, color) {
  const cx = col * cell + cell / 2;
  const cy = row * cell + cell / 2;
  const outerR = Math.max(cell * 0.46, 4);
  const innerR = outerR * 0.42;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerA = (i * 2 * Math.PI / 5) - Math.PI / 2;
    const innerA = outerA + Math.PI / 5;
    if (i === 0) ctx.moveTo(cx + Math.cos(outerA) * outerR, cy + Math.sin(outerA) * outerR);
    else         ctx.lineTo(cx + Math.cos(outerA) * outerR, cy + Math.sin(outerA) * outerR);
    ctx.lineTo(cx + Math.cos(innerA) * innerR, cy + Math.sin(innerA) * innerR);
  }
  ctx.closePath();
  ctx.fill();
}

// ── Main render loop ─────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  moveCameraAroundMenu();
  renderer.render(scene, menuCamera);
}

document.getElementById("background").appendChild(renderer.domElement);
animate();
