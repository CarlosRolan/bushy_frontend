import * as THREE from "three";
import { staticMazeData } from "../staticMazeData.js";

// Cell size of the maze
const cellSize = 2;
const halfCellSize = cellSize / 2;
const mazeBoundingBoxes = [];

//Funciones para autopgenerar el mapa==================================
function createArray(w, h) {
  if (w % 2 === 0 || h % 2 === 0) {
    throw new Error("Width and height must be odd numbers");
  }

  // Initialize the maze with walls (1s)
  let mazeData = Array.from({ length: h }, () => Array(w).fill(1));
  return mazeData;
}

function generateMazeData(mazeData) {
  const width = mazeData.length;
  const height = mazeData[0].length;

  // Define directions for moving: [right, down, left, up]
  const directions = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0]
  ];

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function isInBounds(x, y) {
    return x >= 0 && y >= 0 && x < height && y < width;
  }

  function carvePath(x, y) {
    mazeData[x][y] = 0;
    shuffle(directions);

    for (let [dx, dy] of directions) {
      let nx = x + 2 * dx;
      let ny = y + 2 * dy;
      if (isInBounds(nx, ny) && mazeData[nx][ny] == 1) {
        mazeData[x + dx][y + dy] = 0;
        carvePath(nx, ny);
      }
    }
  }

  // Start carving from the top-left corner
  carvePath(1, 1);

  // Ensure entrance and exit
  mazeData[0][1] = 0;  // Entrance
  mazeData[height - 1][width - 2] = 0;  // Exit

  // Add impassable areas marked with "2"
  for (let i = 0; i < height; i += 4) {
    for (let j = 0; j < width; j += 3) {
      if (mazeData[i][j] === 1) {
        mazeData[i][j] = 2;
      }
    }
  }

  return mazeData;
}
//=====================================================================


// Shared materials – created once, reused on rebuild
const _textureLoader = new THREE.TextureLoader();
const _bushMaterial  = new THREE.MeshBasicMaterial({ map: _textureLoader.load('res/img/texture_maze.jpg') });
const _wallMaterial  = new THREE.MeshBasicMaterial({ map: _textureLoader.load('res/img/texture_maze_wall.jpg') });
const _cellGeometry  = new THREE.BoxGeometry(cellSize, cellSize, cellSize);

function _populateMaze(group, mazeData) {
  const offsetX = (mazeData[0].length / 2) * cellSize;
  const offsetZ = (mazeData.length / 2) * cellSize;

  for (let i = 0; i < mazeData.length; i++) {
    for (let j = 0; j < mazeData[i].length; j++) {
      const v = mazeData[i][j];
      if (v !== 1 && v !== 2) continue;

      const mat  = v === 2 ? _bushMaterial : _wallMaterial;
      const mesh = new THREE.Mesh(_cellGeometry, mat);
      mesh.position.set(j * cellSize - offsetX + halfCellSize, 1, i * cellSize - offsetZ + halfCellSize);
      group.add(mesh);

      const bb   = new THREE.Box3().setFromObject(mesh);
      bb.type    = v === 2 ? 'bush' : 'wall';
      mazeBoundingBoxes.push(bb);
    }
  }
}

function initMaze(mazeData) {
  const mazeGroup = new THREE.Group();
  _populateMaze(mazeGroup, mazeData);
  return mazeGroup;
}

// Rebuild the maze group in-place with new data (background scene keeps its ref)
function rebuildMaze(newMazeData) {
  while (maze.children.length) maze.remove(maze.children[0]);
  mazeBoundingBoxes.length = 0;
  _populateMaze(maze, newMazeData);
  maze.mazeData = newMazeData;
}

const maze = initMaze(staticMazeData);

maze.mazeBoundingBoxes = mazeBoundingBoxes;
maze.cellSize = cellSize;
maze.mazeData = staticMazeData;

export { maze, rebuildMaze, generateMazeData, createArray };
