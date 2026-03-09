import * as THREE from "../../three/build/three.module.js";

// Define camera parameters
const FOV = 50;
const ASPECT_RATIO = window.innerWidth / window.innerHeight;
const NEAR_PLANE = 0.1;
const FAR_PLANE = 1000;
const CAMERA_POSITION = new THREE.Vector3(0, 5, -10);

// Define time variable for camera movement
let time = 0;
let r1 = Math.floor(Math.random() * 1) + 1;
let r2 = Math.floor(Math.random() * 100) + 1;
let r3 = r1;

// Create the camera
const playerCamera = new THREE.PerspectiveCamera(FOV, ASPECT_RATIO, NEAR_PLANE, FAR_PLANE);
playerCamera.position.copy(CAMERA_POSITION);

const menuCamera = new THREE.PerspectiveCamera(FOV, ASPECT_RATIO, NEAR_PLANE, FAR_PLANE);
menuCamera.position.copy(CAMERA_POSITION);

function moveCameraAroundMenu() {
 const radius = 100; // Adjust the radius of the circular motion
 const speed = 0.005; // Adjust the speed of the movement

 const centerX = 0; // Adjust the x-coordinate of the map's center
 const centerY = 0; // Adjust the y-coordinate of the map's center
 const centerZ = 0; // Adjust the z-coordinate of the map's center

 if (r3 < r2) {
  r3++;
 } else if (r3 == r2) {
  r3 = r2
 } else {
  r3--;
 }

 const x = centerX + radius * Math.cos(time) + r3;
 const z = centerZ + radius * Math.sin(time) + r3;

 menuCamera.position.set(x, 100, z); // Adjust the y-coordinate to set the camera above the map
 menuCamera.lookAt(centerX, 0, centerZ); // Look at the center of the map

 time += speed;
}

export { playerCamera, menuCamera, moveCameraAroundMenu };
