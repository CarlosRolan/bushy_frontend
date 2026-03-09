import * as THREE from "../../three/build/three.module.js";
// LIGHTS
const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820, 1); // no shadows
const dirlight = new THREE.DirectionalLight(0xffffff, 0.3, 50); // shadows
dirlight.position.set(1, 2, -1);
dirlight.castShadow = true;

export { ambient, dirlight }