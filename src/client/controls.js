const keys = {
  W: false,
  A: false,
  S: false,
  D: false,
  F: false,
  X: false,
  Space: false
};

// Control de ratón para rotar la cámara alrededor del jugador
let mouseDown = false;
let lastMouseX = null;
let cameraRotation = 0;
let playerRotation = 0;

function calculateNewPos({ x, y, z }, speed) {
  if (keys.W) {
    x += speed * Math.sin(playerRotation);
    z += speed * Math.cos(playerRotation);
  }
  if (keys.A) {
    x += speed * Math.cos(playerRotation);
    z -= speed * Math.sin(playerRotation);
  }
  if (keys.S) {
    x -= speed * Math.sin(playerRotation);
    z -= speed * Math.cos(playerRotation);
  }
  if (keys.D) {
    x -= speed * Math.cos(playerRotation);
    z += speed * Math.sin(playerRotation);
  }
  if (keys.Space) {
    y += 0.1;
  }
  if (keys.F) {
    y -= 0.1;
  }

  return { x, y, z };
}

function onKey(key, callback) {
  if (keys[key] === true) {
    callback();
    return true;
  }
  return false;
}

// MOUSE EVENTS
function onMouseDown(event) {
  mouseDown = true;
  lastMouseX = event.clientX;
}

function onMouseUp() {
  mouseDown = false;
  lastMouseX = null;
  playerRotation = cameraRotation;
}

function onMouseMove(event) {
  if (!mouseDown) return;

  const deltaX = event.clientX - lastMouseX;
  cameraRotation -= deltaX * 0.001;
  lastMouseX = event.clientX;
}


// KEYBOARD EVENTS
function onKeyChange(event, isPressed) {
  if (event.code === 'Space') {
    keys["Space"] = isPressed;
    return;
  }

  const key = event.key.toUpperCase();
  if (keys.hasOwnProperty(key)) {
    keys[key] = isPressed;
  }

}

function onKeyDown(event) {
  onKeyChange(event, true);
}

function onKeyUp(event) {
  onKeyChange(event, false);
}

function onMouseScroll(camera) {
  console.log("onScroll");
  camera.position.set(x, camera.position.y++, z); // Adjust the y-coordinate to set the camera above the map
}

function isMoveKeyPressed() {
  return keys.W || keys.A || keys.S || keys.D;
}

// walking = intenta moverse (teclas), no incluye saltar/bajar/subir
function isPlayerWalking() {
  return isMoveKeyPressed();
}

// útil para detectar “key press” (flanco) sin repetir cada frame
let prevMovePressed = false;
function wasMoveKeyJustPressed() {
  const now = isMoveKeyPressed();
  const justPressed = now && !prevMovePressed;
  prevMovePressed = now;
  return justPressed;
}

function wasMoveKeyJustReleased() {
  const now = isMoveKeyPressed();
  const justReleased = !now && prevMovePressed;
  prevMovePressed = now;
  return justReleased;
}


const keyEvents = { onKeyDown, onKeyUp };
const mouseEvents = { onMouseDown, onMouseUp, onMouseMove, onMouseScroll };

export { keyEvents, mouseEvents, calculateNewPos, playerRotation, cameraRotation, onKey, isPlayerWalking, wasMoveKeyJustPressed, wasMoveKeyJustReleased };
