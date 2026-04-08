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

const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });

const star = new THREE.Mesh(starGeometry, starMaterial);
star.scale.setScalar(0.4);

// --- Animation ---
let time = 0;

function rotateStar() {
  time += 0.02;

  star.rotation.y += 0.02;
  star.position.y  = 1.5 + Math.sin(time) * 0.5; // smooth vertical oscillation
}

export { star, rotateStar };
