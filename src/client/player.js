import * as THREE from "../../three/build/three.module.js";
import { OBJLoader } from "../../three/examples/jsm/loaders/OBJLoader.js";
//import { FontLoader, TextGeometry } from "../../three/examples/jsm/Addons.js";
//import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

const RED = 0xff0000;
const RED_2 = 0x640000
const GREEN = 0x00ff00;
const GREEN_2 = 0x006400;
const BLUE = 0x0000ff;
const BLUE_2 = 0x000064;

//Construct the cube example mesh for debugging
function getExampleMesh() {
  // PLAYER BODY example
  const exampleCubeMaterials = [
    new THREE.MeshBasicMaterial({ color: RED }), // Right side
    new THREE.MeshBasicMaterial({ color: RED_2 }), // Left side
    new THREE.MeshBasicMaterial({ color: GREEN }), // Top side
    new THREE.MeshBasicMaterial({ color: GREEN_2 }), // Bottom side
    new THREE.MeshBasicMaterial({ color: BLUE }), // Front side
    new THREE.MeshBasicMaterial({ color: BLUE_2 })  // Back side
  ];

  const exampleMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    exampleCubeMaterials);
  exampleMesh.name = "example";
  exampleMesh.geometry.computeBoundingSphere();
  exampleMesh.geometry.computeBoundingBox();

  return exampleMesh;
}

//Get directional arrows
function getArrows() {
  // Create arrow helpers for x, y, z axes
  const arrowGroup = new THREE.Group();
  arrowGroup.name = "debug_arrows";
  const ARROW_SIZE = 1;
  const AXIS_COLORS = {
    x: 0xff0000, // Red
    y: 0x00ff00, // Green
    z: 0x0000ff  // Blue
  };
  const directions = [
    { dir: new THREE.Vector3(1, 0, 0), color: AXIS_COLORS.x, name: "arrowX" }, // X axis
    { dir: new THREE.Vector3(0, 1, 0), color: AXIS_COLORS.y, name: "arrowY" }, // Y axis
    { dir: new THREE.Vector3(0, 0, 1), color: AXIS_COLORS.z, name: "arrowZ" }  // Z axis
  ];
  directions.forEach(({ dir, color, name }) => {
    const arrowHelper = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), ARROW_SIZE, color);
    arrowHelper.name = name;
    arrowGroup.add(arrowHelper);
  });

  return arrowGroup;
}

function loadOBJ(path) {
  const loader = new OBJLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (object) => {
        resolve(object);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      (error) => {
        reject(error);
      }
    );
  });
}

async function getObj(path) {
  try {
    const obj = await loadOBJ(path);
    return obj;
  } catch (error) {
    console.error("Failed to load OBJ model:", error);
    return null;
  }
}

const playerBodyData = await getObj("res/data/player_alpha.obj");
playerBodyData.name = "body";

const playerBody = playerBodyData.getObjectByName("Mesh_0");
playerBody.geometry.computeBoundingSphere();

function createCollider(radius) {
  radius = radius + 0.1;
  // Create the bounding sphere helper
  const collider = new THREE.Mesh(
    new THREE.BoxGeometry(radius, radius, radius),
    new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }));
  collider.name = "collider";
  collider.geometry.computeBoundingSphere();
  collider.geometry.computeBoundingBox();

  return collider;
}

class Player {
  constructor(id) {

    // Assign an ID to the player
    this.id = id == null ? Math.floor(Math.random() * 100) : id;
    this.climbing = false;
    this.speed = 1;
    this.readyToStart = false;

    // Main group for visual components
    const group = new THREE.Group();
    group.name = "body_group";
    // Group for helpers (bounding box, bounding sphere, arrows)
    const debug = new THREE.Group();
    debug.name = "debug_group";

    // Create a sphere to represent the player's body
    const exampleMesh = getExampleMesh();
    group.add(exampleMesh);

    //Add the sphere that represents the collission volumne
    //this.debug.add(boundingSphereMesh);
    //Add the direction helping arrows
    const arrowGroup = getArrows();
    debug.add(arrowGroup);

    // Add both groups to the player mesh
    this.mesh = new THREE.Group();
    this.mesh.name = "player_mesh";

    /*
    const loader = new FontLoader();
    const font = loader.load('res/font/myFont.json');
    const textGeometry = new TextGeometry('IIDIDIDIDID');
    const textMesh = new THREE.Mesh(textGeometry, boundingSphereGeometry);
    this.mesh.add(textMesh);
    */

    this.mesh.add(group);
    this.mesh.add(debug);
    //const collider = getCollider(exampleMesh.geometry.boundingSphere.radius);
    const collider = createCollider(0.5);
    this.mesh.add(collider);

    this.mesh.name = this.id; // Corrected to use this.id
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  isMoving() {
    
  }

  getCollider() {
    const collider = this.mesh.getObjectByName("collider");
    collider.geometry.computeBoundingBox();
    collider.geometry.computeBoundingSphere();
    return collider;
  }

  getBoxCollider() {
    const collider = this.mesh.getObjectByName("collider");
    collider.geometry.computeBoundingBox();
    return collider.geometry.boundingBox;
  }

  getSphereCollider() {
    const collider = this.mesh.getObjectByName("collider");
    collider.geometry.computeBoundingSphere();
    return collider.geometry.boundingSphere;
  }

  add(newObj) {
    this.mesh.add(newObj);
  }

  isClimbing() {
    return this.climbing;
  }

  getCurrentPos() {
    const { x, y, z } = this.mesh.position;
    return { x, y, z };
  }

  move(x, y, z) {
    this.mesh.position.set(x, y, z);
  }

  rotate(newRotation) {
    this.mesh.rotation.y = newRotation;
  }

  readyToStart() {
    this.ready = true;
  }

  getCurrentRotation() {
    this.mesh.p
  }
}

// Export player and enemies
const p = new Player();
const enemies = new Set();

export { Player, p, enemies };
