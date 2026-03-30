import * as THREE from "three";

// --- Shape ---
// Proper 5-pointed star: alternate outer (r=1) and inner (r=0.4) vertices.
// Start at the top point (angle = -π/2) and go clockwise.
const OUTER_R = 1;
const INNER_R = 0.4;
const POINTS  = 5;

const starShape = new THREE.Shape();
for (let i = 0; i < POINTS; i++) {
  const outerAngle = (i * 2 * Math.PI / POINTS) - Math.PI / 2;
  const innerAngle = outerAngle + Math.PI / POINTS;

  const ox = Math.cos(outerAngle) * OUTER_R;
  const oy = Math.sin(outerAngle) * OUTER_R;
  const ix = Math.cos(innerAngle) * INNER_R;
  const iy = Math.sin(innerAngle) * INNER_R;

  i === 0 ? starShape.moveTo(ox, oy) : starShape.lineTo(ox, oy);
  starShape.lineTo(ix, iy);
}
starShape.closePath();

// --- Geometry ---
const starGeometry = new THREE.ExtrudeGeometry(starShape, {
  depth: 0.3,
  bevelEnabled: true,
  bevelThickness: 0.05,
  bevelSize: 0.05,
  bevelSegments: 3,
});
starGeometry.center(); // center around origin so rotation looks correct

// --- Material: gold with emissive so it glows even without direct light ---
const starMaterial = new THREE.MeshStandardMaterial({
  color: 0xffd700,
  emissive: 0xffa500,
  emissiveIntensity: 0.6,
  metalness: 0.8,
  roughness: 0.2,
});

const star = new THREE.Mesh(starGeometry, starMaterial);
star.scale.setScalar(0.4);

// --- Point light attached to the star so it illuminates the surroundings ---
const starLight = new THREE.PointLight(0xffd700, 2, 6);
star.add(starLight);

// --- Animation ---
let bouncingUp = true;
let time = 0;

function rotateStar() {
  time += 0.03;

  // Spin
  star.rotation.y += 0.02;
  star.rotation.z  = Math.sin(time * 0.5) * 0.15; // slight wobble

  // Bounce
  const bounceAmount = 0.02;
  if (bouncingUp) {
    star.position.y += bounceAmount;
    if (star.position.y >= 2) bouncingUp = false;
  } else {
    star.position.y -= bounceAmount;
    if (star.position.y <= 1) bouncingUp = true;
  }

  // Pulse the glow
  starLight.intensity = 1.5 + Math.sin(time * 2) * 0.8;
  starMaterial.emissiveIntensity = 0.5 + Math.sin(time * 2) * 0.3;
}

export { star, rotateStar };
