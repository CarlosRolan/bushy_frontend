import * as THREE from "../../three/build/three.module.js";

// Create the WebGLRenderer with anti-aliasing and set its size
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Set pixel ratio for better quality on high-DPI screens
renderer.setPixelRatio(window.devicePixelRatio);

// Append the renderer to the document body or a specific HTML element
//document.body.appendChild(renderer.domElement);

// Function to handle window resize
const onWindowResize = () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
};

// Add event listener for window resize
window.addEventListener('resize', onWindowResize, false);

// Export the renderer
export { renderer };
