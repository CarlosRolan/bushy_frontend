import * as THREE from "../../three/build/three.module.js";

const maxGroundWidth = 102;
const maxGroundHeight = 102;

// Initialize the ground directly
const groundGeometry = new THREE.PlaneGeometry(maxGroundWidth, maxGroundHeight, 10, 10);

// Load the texture
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('res/img/texture_ground.png');

// Set the repeat property of the texture
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
const repeatX = 70; // Number of times to repeat the texture horizontally
const repeatY = 70; // Number of times to repeat the texture vertically
texture.repeat.set(repeatX, repeatY);

// Create a material using the texture
const groundMaterial = new THREE.MeshBasicMaterial({ map: texture });

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = Math.PI / -2;


//IMPORTAN the 0.5 represent the player width;
const minX = (-maxGroundWidth / 2) + 0.5;
const maxX = (maxGroundWidth / 2) - 0.5;
const minZ = (-maxGroundHeight / 2) + 0.5;
const maxZ = (maxGroundHeight / 2) - 0.5;

ground.boundries = { minX, maxX, minZ, maxZ };

export { ground };
