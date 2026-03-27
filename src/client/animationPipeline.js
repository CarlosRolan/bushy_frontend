import { GLTFLoader } from "../../three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "../../three/examples/jsm/loaders/FBXLoader.js";

// Load a GLTF/GLB file from a browser File object via blob URL
function loadGLTFFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => { URL.revokeObjectURL(url); resolve(gltf); },
      undefined,
      (err) => { URL.revokeObjectURL(url); reject(err); }
    );
  });
}

// Load an FBX file from a browser File object via blob URL
function loadFBXFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const loader = new FBXLoader();
    loader.load(
      url,
      (fbx) => { URL.revokeObjectURL(url); resolve(fbx); },
      undefined,
      (err) => { URL.revokeObjectURL(url); reject(err); }
    );
  });
}

// Detect format and load the model, returning { type, scene, animations }
async function loadModelFromFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'glb' || ext === 'gltf') {
    const gltf = await loadGLTFFromFile(file);
    return { type: 'gltf', scene: gltf.scene, animations: gltf.animations };
  }

  if (ext === 'fbx') {
    const fbx = await loadFBXFromFile(file);
    return { type: 'fbx', scene: fbx, animations: fbx.animations };
  }

  throw new Error(`Unsupported format ".${ext}". Use .glb, .gltf, or .fbx`);
}

// Load the default model from a static path (no file picker needed)
function loadDefaultModel(path) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      path,
      (gltf) => resolve({ type: 'gltf', scene: gltf.scene, animations: gltf.animations }),
      undefined,
      reject
    );
  });
}

// Build and attach the upload panel to the DOM.
// onModelLoaded(result) is called with { type, scene, animations } on success.
function initAnimationPipeline(onModelLoaded) {
  const panel = document.createElement('div');
  panel.id = 'model-upload-panel';

  const label = document.createElement('span');
  label.textContent = 'Player Model';

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.glb,.gltf,.fbx';
  input.id = 'model-file-input';

  const status = document.createElement('span');
  status.id = 'model-upload-status';

  panel.appendChild(label);
  panel.appendChild(input);
  panel.appendChild(status);
  document.body.appendChild(panel);

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    status.textContent = 'Loading…';
    status.className = '';

    try {
      const result = await loadModelFromFile(file);
      status.textContent = `"${file.name}" loaded (${result.animations.length} anim${result.animations.length !== 1 ? 's' : ''})`;
      status.className = 'ok';
      onModelLoaded(result);
    } catch (err) {
      console.error('[AnimationPipeline] Failed to load model:', err);
      status.textContent = `Error: ${err.message}`;
      status.className = 'err';
    }

    // Allow re-uploading the same file
    input.value = '';
  });
}

export { initAnimationPipeline, loadDefaultModel };
