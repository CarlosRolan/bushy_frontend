import * as THREE from "../../three/build/three.module.js";
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


function initMaze(mazeData) {
  const mazeGroup = new THREE.Group();
  const mazeCellGeometry = new THREE.BoxGeometry(cellSize, cellSize, cellSize);

  // Load the bush texture
  const textureLoader = new THREE.TextureLoader();

  const bushTexture = textureLoader.load('res/img/texture_maze.jpg'); // Replace with your texture file path
  const bushMaterial = new THREE.MeshBasicMaterial({ map: bushTexture });

  const wallTexture = textureLoader.load('res/img/texture_maze_wall.jpg'); // Replace with your texture file path
  const wallMaterial = new THREE.MeshBasicMaterial({ map: wallTexture });

  const debugMaterialWall = new THREE.MeshBasicMaterial({ wireframe: true, color: "#FF0000" });
  const debugMaterialBush = new THREE.MeshBasicMaterial({ wireframe: true, color: "#00FF00" });

  const offsetX = (mazeData[0].length / 2) * cellSize; // Adjusted for maze width
  const offsetZ = (mazeData.length / 2) * cellSize;

  for (let i = 0; i < mazeData.length; i++) {
    for (let j = 0; j < mazeData[i].length; j++) {
      if (mazeData[i][j] === 2) {

        // BUSH MATERIAL
        const bush = new THREE.Mesh(mazeCellGeometry, bushMaterial);
        bush.position.set(j * cellSize - offsetX + halfCellSize, 1, i * cellSize - offsetZ + halfCellSize);
        mazeGroup.add(bush);

        const boundingBox = new THREE.Box3().setFromObject(bush);
        boundingBox.type = 'bush';
        mazeBoundingBoxes.push(boundingBox);

      } else if (mazeData[i][j] === 1) {

        // WALL MATERIAL
        const wall = new THREE.Mesh(mazeCellGeometry, wallMaterial);
        wall.position.set(j * cellSize - offsetX + halfCellSize, 1, i * cellSize - offsetZ + halfCellSize);
        mazeGroup.add(wall);

        const boundingBox = new THREE.Box3().setFromObject(wall);
        boundingBox.type = 'wall';
        mazeBoundingBoxes.push(boundingBox);
      }
    }
  }

  return mazeGroup;
}

//const mazeDataArray = createArray(51, 51);
//const mazeData = generateMazeData(mazeXY);

const maze = initMaze(staticMazeData);

console.log(maze);

maze.mazeBoundingBoxes = mazeBoundingBoxes;
maze.cellSize = cellSize;
maze.mazeData = staticMazeData;

export { maze };
