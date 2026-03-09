import * as THREE from "../../three/build/three.module.js";

// Load the audio
const listener = new THREE.AudioListener();
const audioLoader = new THREE.AudioLoader();
//camera.add(listener);

// Walking sound
const walkSound = new THREE.Audio(listener);
audioLoader.load('res/sound/walking_sound.wav', function (buffer) {
  walkSound.setBuffer(buffer);
  walkSound.setLoop(true); // Loop the walking sound
  walkSound.setVolume(0.5);
});

// Bush collision sound
const mazeCollisionSound = new THREE.Audio(listener);
audioLoader.load('res/sound/bush_sound.wav', function (buffer) {
  mazeCollisionSound.setBuffer(buffer);
  mazeCollisionSound.setLoop(false);
  mazeCollisionSound.setVolume(0.5);
});

const winningSound = new THREE.Audio(listener);
audioLoader.load('res/sound/winning_sound.mp3', function (buffer) {
  winningSound.setBuffer(buffer);
  winningSound.setLoop(false);
  winningSound.setVolume(0.5);
});

const loossingSound = new THREE.Audio(listener);
audioLoader.load('res/sound/loossing_sound.wav', function (buffer) {
  loossingSound.setBuffer(buffer);
  loossingSound.setLoop(false);
  loossingSound.setVolume(0.5);
});

export { listener, walkSound, mazeCollisionSound, winningSound, loossingSound };

