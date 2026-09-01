import * as THREE from "three";
import "./style.css";

// ---------- Elemen antarmuka ----------
const $ = (selector) => document.querySelector(selector);
const app = $("#app");
const canvas = $("#scene");
const incomingScreen = $("#incomingScreen");
const callScreen = $("#callScreen");
const endedScreen = $("#endedScreen");
const acceptBtn = $("#acceptBtn");
const declineBtn = $("#declineBtn");
const hangupBtn = $("#hangupBtn");
const redialBtn = $("#redialBtn");
const muteBtn = $("#muteBtn");
const muteLabel = $("#muteLabel");
const soundHint = $("#soundHint");
const callTimer = $("#callTimer");
const endedDuration = $("#endedDuration");
const callStatus = $("#callStatus");
const caption = $("#caption");
const captionSpeaker = $("#captionSpeaker");
const captionText = $("#captionText");
const listeningBadge = $("#listeningBadge");
const chatForm = $("#chatForm");
const chatInput = $("#chatInput");
const voiceBtn = $("#voiceBtn");
const voiceDialog = $("#voiceDialog");
const voiceSelect = $("#voiceSelect");
const testVoiceBtn = $("#testVoiceBtn");
const toast = $("#toast");

const state = {
  phase: "incoming",
  muted: false,
  speaking: false,
  thinking: false,
  callStartedAt: 0,
  duration: 0,
  timerId: null,
  captionTimer: null,
  toastTimer: null,
  ringTimer: null,
  audioContext: null,
  recognition: null,
  recognitionActive: false,
  userName: "",
};

// ---------- Dunia 3D ----------
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x173631, 0.045);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.48, 5.55);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const hemi = new THREE.HemisphereLight(0xbde9dd, 0x152013, 2.3);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xffedd2, 4.2);
keyLight.position.set(-4, 8, 7);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.left = -7;
keyLight.shadow.camera.right = 7;
keyLight.shadow.camera.top = 8;
keyLight.shadow.camera.bottom = -4;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x54d5bd, 3.5);
rimLight.position.set(5, 4, -5);
scene.add(rimLight);

function makeScaleTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const ctx = textureCanvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 256, 256);
  gradient.addColorStop(0, "#6d7163");
  gradient.addColorStop(0.5, "#47554a");
  gradient.addColorStop(1, "#273b34");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  let seed = 92817;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 1800; i += 1) {
    const x = random() * 256;
    const y = random() * 256;
    const radius = 0.5 + random() * 2.8;
    const light = 25 + Math.floor(random() * 28);
    ctx.fillStyle = `hsla(${105 + random() * 25}, 14%, ${light}%, ${0.12 + random() * 0.22})`;
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 1.6, radius, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 2.4);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

const scaleTexture = makeScaleTexture();
const skinMaterial = new THREE.MeshStandardMaterial({
  color: 0x667064,
  map: scaleTexture,
  bumpMap: scaleTexture,
  bumpScale: 0.06,
  roughness: 0.78,
  metalness: 0.02,
});
const darkSkinMaterial = new THREE.MeshStandardMaterial({ color: 0x283c35, map: scaleTexture, roughness: 0.88 });
const bellyMaterial = new THREE.MeshStandardMaterial({ color: 0x8c8771, roughness: 0.8 });
const sailMaterial = new THREE.MeshStandardMaterial({ color: 0x9f4b3e, roughness: 0.72, side: THREE.DoubleSide });
const sailEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0x302f27, roughness: 0.9 });
const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x7b292b, roughness: 0.65 });
const tongueMaterial = new THREE.MeshStandardMaterial({ color: 0xb7515b, roughness: 0.65 });
const toothMaterial = new THREE.MeshStandardMaterial({ color: 0xfff4ce, roughness: 0.55 });
const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xd8bf55, emissive: 0x594400, emissiveIntensity: 1.2, roughness: 0.35 });
const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x060807 });

const sphereGeometry = new THREE.SphereGeometry(1, 32, 22);
const lowSphereGeometry = new THREE.SphereGeometry(1, 18, 12);

function ellipsoid(parent, name, position, scale, material = skinMaterial, geometry = sphereGeometry) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function segment(parent, start, end, radiusTop, radiusBottom, material = skinMaterial, radial = 16) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const midpoint = a.clone().add(b).multiplyScalar(0.5);
  const length = a.distanceTo(b);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, length, radial, 1), material);
  mesh.position.copy(midpoint);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addClaw(parent, position, rotation = [0, 0, 0], scale = 1) {
  const claw = new THREE.Mesh(new THREE.ConeGeometry(0.055 * scale, 0.3 * scale, 7), toothMaterial);
  claw.position.set(...position);
  claw.rotation.set(...rotation);
  claw.castShadow = true;
  parent.add(claw);
  return claw;
}

function buildSpinosaurus() {
  const dino = new THREE.Group();
  dino.name = "Spinosaurus";
  dino.position.y = -1.55;
  scene.add(dino);

  // Badan, dada, perut.
  ellipsoid(dino, "torso", [0, 1.55, -0.2], [1.35, 1.24, 2.0]);
  ellipsoid(dino, "chest", [0, 2.08, 0.72], [1.1, 1.25, 1.1]);
  ellipsoid(dino, "belly", [0, 1.38, 0.72], [0.88, 0.84, 0.92], bellyMaterial);

  // Layar punggung khas Spinosaurus.
  const sailShape = new THREE.Shape();
  sailShape.moveTo(-2.25, 0);
  sailShape.lineTo(-1.85, 1.05);
  sailShape.lineTo(-1.25, 2.2);
  sailShape.lineTo(-0.45, 2.85);
  sailShape.lineTo(0.45, 2.58);
  sailShape.lineTo(1.35, 1.65);
  sailShape.lineTo(2.0, 0.55);
  sailShape.lineTo(2.3, 0);
  sailShape.closePath();
  const sail = new THREE.Mesh(new THREE.ExtrudeGeometry(sailShape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.04, bevelSegments: 2 }), sailMaterial);
  sail.rotation.y = Math.PI / 2;
  sail.position.set(-0.09, 2.15, -0.2);
  sail.scale.set(0.95, 0.95, 0.95);
  sail.castShadow = true;
  dino.add(sail);

  for (let i = 0; i < 7; i += 1) {
    const z = -1.8 + i * 0.58;
    const height = 0.75 + Math.sin((i / 6) * Math.PI) * 1.65;
    segment(dino, [0, 2.5, z], [0, 2.5 + height, z], 0.045, 0.075, sailEdgeMaterial, 8);
  }

  // Ekor melengkung.
  const tailPoints = [
    [0, 1.58, -1.7],
    [0.08, 1.42, -2.8],
    [0.45, 1.24, -3.75],
    [1.05, 1.08, -4.55],
    [1.72, 1.05, -5.15],
  ];
  const tailRadii = [0.7, 0.55, 0.39, 0.24, 0.07];
  tailPoints.slice(0, -1).forEach((point, index) => {
    segment(dino, point, tailPoints[index + 1], tailRadii[index + 1], tailRadii[index], skinMaterial, 18);
  });

  // Kaki belakang yang besar.
  const legs = [];
  [-1, 1].forEach((side) => {
    const leg = new THREE.Group();
    leg.position.x = side * 0.86;
    dino.add(leg);
    ellipsoid(leg, "thigh", [0, 0.85, -0.24], [0.56, 0.82, 0.64]);
    segment(leg, [0, 0.6, -0.22], [side * 0.05, -0.08, 0.1], 0.28, 0.42, darkSkinMaterial);
    ellipsoid(leg, "foot", [side * 0.02, -0.17, 0.43], [0.45, 0.22, 0.76], darkSkinMaterial, lowSphereGeometry);
    [-0.22, 0, 0.22].forEach((toeX) => addClaw(leg, [toeX, -0.2, 1.08], [Math.PI / 2, 0, 0], 1.05));
    legs.push(leg);
  });

  // Leher dan kepala menjadi satu root agar bisa mengikuti pengguna.
  const headRoot = new THREE.Group();
  headRoot.position.set(0, 2.15, 0.45);
  dino.add(headRoot);
  ellipsoid(headRoot, "neck", [0, 0.1, 0.15], [0.78, 1.08, 0.78], skinMaterial);
  ellipsoid(headRoot, "skull", [0, 0.92, 0.78], [0.82, 0.72, 0.92], skinMaterial);
  ellipsoid(headRoot, "browLeft", [-0.49, 1.17, 0.96], [0.34, 0.23, 0.34], darkSkinMaterial, lowSphereGeometry);
  ellipsoid(headRoot, "browRight", [0.49, 1.17, 0.96], [0.34, 0.23, 0.34], darkSkinMaterial, lowSphereGeometry);
  ellipsoid(headRoot, "upperSnout", [0, 0.73, 1.55], [0.72, 0.39, 1.07], skinMaterial);
  ellipsoid(headRoot, "nose", [0, 0.76, 2.27], [0.65, 0.34, 0.45], darkSkinMaterial);

  // Lubang hidung.
  const nostrilMaterial = new THREE.MeshBasicMaterial({ color: 0x101613 });
  [-1, 1].forEach((side) => {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), nostrilMaterial);
    nostril.position.set(side * 0.32, 0.94, 2.55);
    nostril.scale.set(1.2, 0.52, 0.34);
    headRoot.add(nostril);
  });

  // Mata dengan kelopak yang dianimasikan.
  const eyes = [];
  [-1, 1].forEach((side) => {
    const eye = ellipsoid(headRoot, "eye", [side * 0.48, 1.2, 1.18], [0.19, 0.18, 0.13], eyeMaterial, lowSphereGeometry);
    const pupil = ellipsoid(headRoot, "pupil", [side * 0.49, 1.2, 1.305], [0.052, 0.145, 0.028], pupilMaterial, lowSphereGeometry);
    eye.castShadow = false;
    pupil.castShadow = false;
    eyes.push({ eye, pupil });
  });

  // Rahang bawah berengsel dan bagian dalam mulut.
  const lowerJaw = new THREE.Group();
  lowerJaw.position.set(0, 0.58, 0.83);
  headRoot.add(lowerJaw);
  ellipsoid(lowerJaw, "lowerJaw", [0, -0.05, 0.77], [0.64, 0.22, 1.16], skinMaterial);
  ellipsoid(lowerJaw, "mouthInterior", [0, 0.12, 0.79], [0.55, 0.08, 0.92], mouthMaterial, lowSphereGeometry);
  ellipsoid(lowerJaw, "tongue", [0, 0.17, 0.92], [0.34, 0.055, 0.67], tongueMaterial, lowSphereGeometry);

  // Dua baris gigi agar siluet mulut terbaca jelas dari depan.
  [-1, 1].forEach((side) => {
    for (let i = 0; i < 6; i += 1) {
      const z = 1.03 + i * 0.25;
      const x = side * (0.48 - i * 0.018);
      const upperTooth = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.26, 7), toothMaterial);
      upperTooth.position.set(x, 0.48, z);
      upperTooth.rotation.z = Math.PI;
      upperTooth.castShadow = true;
      headRoot.add(upperTooth);

      const lowerTooth = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 7), toothMaterial);
      lowerTooth.position.set(x * 0.95, 0.29, z - 0.22);
      lowerJaw.add(lowerTooth);
    }
  });

  // Lengan kecil dan kuku panjang.
  const arms = [];
  [-1, 1].forEach((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.83, 2.0, 0.82);
    arm.rotation.z = side * 0.22;
    dino.add(arm);
    segment(arm, [0, 0, 0], [side * 0.2, -0.52, 0.36], 0.18, 0.24, skinMaterial, 12);
    segment(arm, [side * 0.2, -0.52, 0.36], [side * 0.3, -0.82, 0.78], 0.11, 0.17, darkSkinMaterial, 12);
    [-0.1, 0.05, 0.18].forEach((offset, i) => addClaw(arm, [side * (0.3 + offset), -0.91 - i * 0.015, 0.96], [Math.PI / 2.35, 0, side * 0.1], 0.8));
    arms.push(arm);
  });

  return { dino, headRoot, lowerJaw, eyes, legs, arms };
}

const spino = buildSpinosaurus();

function buildEnvironment() {
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x233b2d, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(23, 64), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.73;
  ground.receiveShadow = true;
  scene.add(ground);

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(18, 64),
    new THREE.MeshStandardMaterial({ color: 0x2e786f, transparent: true, opacity: 0.48, roughness: 0.18, metalness: 0.1 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -1.62, -9);
  scene.add(water);

  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x425348, roughness: 1 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x355f3e, roughness: 0.9, side: THREE.DoubleSide });
  let seed = 67291;
  const random = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };

  for (let i = 0; i < 22; i += 1) {
    const angle = random() * Math.PI * 2;
    const distance = 5.2 + random() * 10;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance - 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + random() * 0.7, 0), rockMaterial);
    rock.position.set(x, -1.45 + random() * 0.15, z);
    rock.scale.y = 0.55 + random() * 0.45;
    rock.rotation.set(random(), random(), random());
    rock.receiveShadow = true;
    scene.add(rock);
  }

  for (let i = 0; i < 36; i += 1) {
    const angle = random() * Math.PI * 2;
    const distance = 5 + random() * 12;
    const fern = new THREE.Group();
    fern.position.set(Math.cos(angle) * distance, -1.68, Math.sin(angle) * distance - 3);
    const height = 0.6 + random() * 1.5;
    segment(fern, [0, 0, 0], [0, height, 0], 0.025, 0.04, darkSkinMaterial, 6);
    for (let j = 0; j < 5; j += 1) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.75, 5), leafMaterial);
      leaf.position.y = height * (0.45 + j * 0.1);
      leaf.rotation.z = Math.PI / 2.8;
      leaf.rotation.y = (j / 5) * Math.PI * 2;
      fern.add(leaf);
    }
    scene.add(fern);
  }

  const particleCount = 150;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    positions[i * 3] = (random() - 0.5) * 18;
    positions[i * 3 + 1] = -0.8 + random() * 8;
    positions[i * 3 + 2] = (random() - 0.5) * 15;
  }
  const particlesGeometry = new THREE.BufferGeometry();
  particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(particlesGeometry, new THREE.PointsMaterial({ color: 0xc9efb6, size: 0.025, transparent: true, opacity: 0.7 }));
  scene.add(particles);
  return { water, particles };
}

const environment = buildEnvironment();
const clock = new THREE.Clock();
const lookTarget = new THREE.Vector3(0, 1.44, 1.45);
const desiredCamera = new THREE.Vector3(0, 1.48, 5.55);
const desiredLook = new THREE.Vector3(0, 1.44, 1.45);
const pointer = new THREE.Vector2();
let nextBlinkAt = 2.5;
let blinkStartedAt = -1;

function cameraForPhase() {
  const portrait = innerWidth / innerHeight < 0.72;
  if (state.phase === "incoming") {
    desiredCamera.set(0, portrait ? 1.48 : 1.42, portrait ? 5.45 : 5.85);
    desiredLook.set(0, 1.43, 1.48);
  } else if (state.phase === "calling") {
    desiredCamera.set(portrait ? 0 : 0.45, portrait ? 1.35 : 1.2, portrait ? 9.2 : 10.1);
    desiredLook.set(0, portrait ? 0.48 : 0.35, 0.4);
  } else {
    desiredCamera.set(0, 1.35, 9.6);
    desiredLook.set(0, 0.45, 0.2);
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  cameraForPhase();
  camera.position.lerp(desiredCamera, 1 - Math.pow(0.002, delta));
  lookTarget.lerp(desiredLook, 1 - Math.pow(0.002, delta));
  camera.lookAt(lookTarget);

  spino.dino.position.y = -1.55 + Math.sin(elapsed * 1.25) * 0.035;
  spino.dino.rotation.y = Math.sin(elapsed * 0.38) * 0.018;
  spino.headRoot.rotation.y += ((pointer.x * 0.12 + Math.sin(elapsed * 0.55) * 0.028) - spino.headRoot.rotation.y) * 0.045;
  spino.headRoot.rotation.x += ((-pointer.y * 0.055 + Math.sin(elapsed * 0.9) * 0.018) - spino.headRoot.rotation.x) * 0.04;
  spino.arms.forEach((arm, index) => {
    arm.rotation.x = Math.sin(elapsed * 1.35 + index * 1.1) * 0.065;
  });
  spino.legs.forEach((leg, index) => {
    leg.rotation.z = Math.sin(elapsed * 0.65 + index * Math.PI) * 0.012;
  });

  let jawAngle = 0.025;
  if (state.speaking) jawAngle = 0.12 + Math.abs(Math.sin(elapsed * 11.5)) * 0.38 + Math.abs(Math.sin(elapsed * 4.2)) * 0.08;
  else if (state.phase === "incoming") jawAngle = 0.035 + Math.max(0, Math.sin(elapsed * 1.35 - 0.5)) ** 18 * 0.42;
  spino.lowerJaw.rotation.x += (jawAngle - spino.lowerJaw.rotation.x) * 0.22;

  if (elapsed > nextBlinkAt && blinkStartedAt < 0) blinkStartedAt = elapsed;
  if (blinkStartedAt >= 0) {
    const progress = (elapsed - blinkStartedAt) / 0.18;
    const scaleY = Math.max(0.07, Math.abs(progress * 2 - 1));
    spino.eyes.forEach(({ eye, pupil }) => {
      eye.scale.y = 0.18 * scaleY;
      pupil.scale.y = 0.145 * scaleY;
    });
    if (progress >= 1) {
      spino.eyes.forEach(({ eye, pupil }) => {
        eye.scale.y = 0.18;
        pupil.scale.y = 0.145;
      });
      blinkStartedAt = -1;
      nextBlinkAt = elapsed + 2.5 + Math.random() * 4;
    }
  }

  environment.water.material.opacity = 0.45 + Math.sin(elapsed * 0.7) * 0.035;
  environment.particles.rotation.y = elapsed * 0.018;
  renderer.render(scene, camera);
}

animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth / innerHeight < 0.72 ? 46 : 42;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
  renderer.setSize(innerWidth, innerHeight);
});

addEventListener("pointermove", (event) => {
  pointer.x = (event.clientX / innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / innerHeight) * 2 + 1;
});

// ---------- Suara dering dan efek audio ----------
function ensureAudio() {
  if (!state.audioContext) state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (state.audioContext.state === "suspended") state.audioContext.resume();
  return state.audioContext;
}

function tone(frequency, start, duration, volume = 0.06, type = "sine") {
  const ctx = ensureAudio();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function ringOnce() {
  if (state.phase !== "incoming") return;
  const ctx = ensureAudio();
  const now = ctx.currentTime;
  [0, 0.22].forEach((offset) => {
    tone(392, now + offset, 0.16, 0.035, "sine");
    tone(523.25, now + offset + 0.04, 0.18, 0.026, "triangle");
  });
  navigator.vibrate?.([90, 70, 90]);
}

function startRingtone() {
  if (state.ringTimer || state.phase !== "incoming") return;
  ringOnce();
  state.ringTimer = setInterval(ringOnce, 2300);
  soundHint.hidden = true;
}

function stopRingtone() {
  clearInterval(state.ringTimer);
  state.ringTimer = null;
}

function dinoRumble() {
  const ctx = ensureAudio();
  const now = ctx.currentTime;
  tone(72, now, 0.24, 0.018, "sawtooth");
  tone(54, now + 0.06, 0.28, 0.012, "triangle");
}

soundHint.addEventListener("click", startRingtone);
app.addEventListener("pointerdown", () => {
  if (state.phase === "incoming" && !state.ringTimer) startRingtone();
}, { once: true });

// ---------- Suara percakapan ----------
let availableVoices = [];

function voiceScore(voice) {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  let score = 0;
  if (lang === "id-id") score += 120;
  else if (lang.startsWith("id")) score += 100;
  if (/natural|online|neural|premium/.test(name)) score += 55;
  if (/google|microsoft|ardi|gadis/.test(name)) score += 28;
  if (voice.localService) score += 5;
  return score;
}

function populateVoices() {
  availableVoices = speechSynthesis.getVoices().sort((a, b) => voiceScore(b) - voiceScore(a));
  voiceSelect.innerHTML = "";
  const saved = localStorage.getItem("spinoVoice");
  availableVoices.forEach((voice, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${voice.name} — ${voice.lang}`;
    if ((saved && voice.name === saved) || (!saved && index === 0)) option.selected = true;
    voiceSelect.append(option);
  });
  if (!availableVoices.length) {
    const option = document.createElement("option");
    option.textContent = "Suara bawaan browser";
    voiceSelect.append(option);
  }
}

populateVoices();
speechSynthesis.addEventListener?.("voiceschanged", populateVoices);

function selectedVoice() {
  return availableVoices[Number(voiceSelect.value)] || availableVoices[0] || null;
}

function showCaption(speaker, text, stay = false) {
  clearTimeout(state.captionTimer);
  captionSpeaker.textContent = speaker;
  captionText.textContent = text;
  caption.hidden = false;
  if (!stay) state.captionTimer = setTimeout(() => { caption.hidden = true; }, Math.max(3500, text.length * 72));
}

function setCallStatus(label, mode = "connected") {
  callStatus.innerHTML = `<span class="status-dot"></span> ${label}`;
  const dot = callStatus.querySelector(".status-dot");
  if (mode === "thinking") dot.style.background = "#ffd45a";
  if (mode === "error") dot.style.background = "#ff645d";
}

function speak(text, { preview = false } = {}) {
  speechSynthesis.cancel();
  stopRecognition();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = selectedVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || "id-ID";
  utterance.rate = 0.9;
  utterance.pitch = 0.78;
  utterance.volume = 1;
  utterance.onstart = () => {
    state.speaking = true;
    if (!preview) {
      setCallStatus("Spino sedang bicara");
      showCaption("Spino", text, true);
    }
    dinoRumble();
  };
  utterance.onend = utterance.onerror = () => {
    state.speaking = false;
    if (!preview && state.phase === "calling") {
      setCallStatus(state.muted ? "mikrofon dimatikan" : "mendengarkanmu");
      state.captionTimer = setTimeout(() => { caption.hidden = true; }, 2300);
      if (!state.muted) startRecognition();
    }
  };
  speechSynthesis.speak(utterance);
}

voiceSelect.addEventListener("change", () => {
  const voice = selectedVoice();
  if (voice) localStorage.setItem("spinoVoice", voice.name);
});

voiceBtn.addEventListener("click", () => {
  populateVoices();
  voiceDialog.showModal?.();
});

testVoiceBtn.addEventListener("click", () => speak("Halo, suaraku terdengar jelas? Aku Spino!", { preview: true }));

// ---------- Pengenalan suara ----------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function setupRecognition() {
  if (!SpeechRecognition) {
    app.classList.add("keyboard-mode");
    showToast("Browser ini belum mendukung mikrofon percakapan. Kamu tetap bisa mengetik.", 5200);
    return null;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "id-ID";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    state.recognitionActive = true;
    if (!state.speaking && state.phase === "calling") listeningBadge.hidden = false;
  };
  recognition.onresult = (event) => {
    let interim = "";
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += text;
      else interim += text;
    }
    if (interim) showCaption("Kamu", interim, true);
    if (finalText.trim()) handleUserInput(finalText.trim());
  };
  recognition.onerror = (event) => {
    state.recognitionActive = false;
    listeningBadge.hidden = true;
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      state.muted = true;
      muteBtn.setAttribute("aria-pressed", "true");
      muteLabel.textContent = "Mik mati";
      app.classList.add("keyboard-mode");
      setCallStatus("gunakan kolom ketik", "error");
      showToast("Izin mikrofon ditolak. Kamu masih bisa ngobrol lewat kolom ketik.", 5600);
    }
  };
  recognition.onend = () => {
    state.recognitionActive = false;
    listeningBadge.hidden = true;
    if (state.phase === "calling" && !state.muted && !state.speaking && !state.thinking) {
      setTimeout(startRecognition, 450);
    }
  };
  return recognition;
}

function startRecognition() {
  if (state.phase !== "calling" || state.muted || state.speaking || state.thinking) return;
  if (!state.recognition) state.recognition = setupRecognition();
  if (!state.recognition || state.recognitionActive) return;
  try { state.recognition.start(); } catch { /* Chrome bisa masih menutup sesi sebelumnya. */ }
}

function stopRecognition() {
  listeningBadge.hidden = true;
  if (state.recognition && state.recognitionActive) {
    try { state.recognition.stop(); } catch { /* Tidak perlu tindakan. */ }
  }
  state.recognitionActive = false;
}

// ---------- Otak percakapan ringan ----------
const pick = (items) => items[Math.floor(Math.random() * items.length)];
const clean = (text) => text.toLowerCase().replace(/[?!.,]/g, " ").replace(/\s+/g, " ").trim();

function makeReply(input) {
  const text = clean(input);
  const nameMatch = text.match(/(?:nama aku|namaku|panggil aku)\s+([a-zA-ZÀ-ÿ' -]{2,24})/i);
  if (nameMatch) {
    state.userName = nameMatch[1].trim().split(" ").slice(0, 2).join(" ");
    return `Senang kenal denganmu, ${state.userName}. Namaku Spino. Jangan khawatir, aku cuma makan ikan!`;
  }

  const name = state.userName ? `, ${state.userName}` : "";
  if (/\b(halo|hai|hello|pagi|siang|sore|malam)\b/.test(text)) {
    return pick([
      `Halo juga${name}! Wah, akhirnya teleponku diangkat.`,
      `Hai${name}! Suaramu kedengaran jelas dari zaman Kapur.`,
      `Halo! Aku Spino. Tenang saja, moncongku memang kelihatan dekat sekali.`,
    ]);
  }
  if (/siapa (kamu|namamu)|nama(mu)? siapa/.test(text)) return "Aku Spino, seekor Spinosaurus. Ahli berenang, penangkap ikan, dan sekarang ahli menelepon.";
  if (/apa kabar|gimana kabar|sehat/.test(text)) return pick(["Baik! Baru selesai berenang dan menangkap ikan. Kamu sendiri bagaimana?", "Aku segar sekali. Sirip punggungku juga sedang bagus hari ini."]);
  if (/makan|makanan|lapar|ikan/.test(text)) return pick(["Aku suka ikan besar. Tapi kalau sedang menelepon, camilan kecil juga cukup.", "Ikan adalah favoritku. Moncong panjang ini memang dibuat untuk menangkapnya."]);
  if (/tinggal|rumah|di mana|dimana/.test(text)) return "Aku tinggal dekat sungai besar di Afrika Utara, sekitar sembilan puluh lima juta tahun yang lalu. Sinyal teleponnya ajaib, ya.";
  if (/umur|berapa tahun|kapan hidup|zaman/.test(text)) return "Spinosaurus hidup pada periode Kapur, kira-kira sembilan puluh sembilan sampai sembilan puluh tiga juta tahun lalu. Aku sudah cukup tua untuk punya banyak cerita.";
  if (/berenang|air|sungai/.test(text)) return "Tentu aku bisa berenang. Ekor dan tubuhku cocok untuk bergerak di air, walau gaya renangku mungkin tidak akan menang lomba manusia.";
  if (/besar|tinggi|panjang|berat/.test(text)) return "Keluargaku bisa tumbuh sangat panjang, lebih panjang dari bus kota. Untung ukuran layar telepon ini bisa menyesuaikan.";
  if (/aum|roar|meraung|suara dinosaurus/.test(text)) {
    setTimeout(dinoRumble, 80);
    return "Rrrrraaaauuugh! Hehe, maaf kalau speakermu bergetar.";
  }
  if (/lelucon|joke|lucu|bercanda/.test(text)) return pick(["Kenapa Spinosaurus selalu angkat telepon? Karena dia tidak mau jadi di-no-saur-us yang tidak bisa dihubungi.", "Ikan apa yang paling susah kutangkap? Ikan yang sedang mode pesawat."]);
  if (/takut|seram|ngeri/.test(text)) return "Tidak perlu takut. Aku memang punya banyak gigi, tapi panggilan ini ramah. Coba lihat mataku, aku sedang tersenyum.";
  if (/sayang|suka aku|teman/.test(text)) return `Tentu saja${name}. Mulai sekarang kamu teman telepon lintas zaman favoritku.`;
  if (/cerita/.test(text)) return "Suatu pagi aku mengejar ikan besar di sungai. Ternyata yang terlihat hanyalah bayangan layar punggungku sendiri. Aku pura-pura tidak malu dan langsung berenang pergi.";
  if (/hujan|cuaca|panas|dingin/.test(text)) return "Di tempatku hangat dan lembap. Cocok untuk berenang, tapi kurang cocok untuk menyimpan ponsel tanpa pelindung air.";
  if (/terima kasih|makasih/.test(text)) return `Sama-sama${name}. Senang bisa menemanimu ngobrol.`;
  if (/dadah|sampai jumpa|selamat tinggal|tutup telepon/.test(text)) {
    setTimeout(endCall, 3200);
    return `Sampai jumpa${name}. Kalau rindu, telepon aku lagi, ya.`;
  }
  if (/bisa dengar|kedengaran|suara.*jelas/.test(text)) return "Kedengaran jelas! Bahkan lebih jelas daripada suara ikan tercebur di sungai.";
  if (/lagi apa|sedang apa|ngapain/.test(text)) return "Aku sedang berdiri dekat sungai sambil meneleponmu. Ini kegiatan paling modern yang pernah kulakukan.";
  if (/kenapa|kok/.test(text)) return pick(["Hmm, pertanyaan bagus. Menurutku ada cerita menarik di balik itu.", "Aku tidak yakin sepenuhnya, tapi aku senang kamu menanyakannya."]);
  if (/ya|iya|betul|benar/.test(text)) return pick([`Nah, kita sepakat${name}!`, "Iya! Ekspresi wajahmu pasti setuju juga."]);
  if (/tidak|nggak|enggak|bukan/.test(text)) return pick(["Oh, baik. Ceritakan versi yang benar kepadaku.", "Wah, aku salah menangkapnya. Coba jelaskan lagi pelan-pelan."]);

  return pick([
    `Aku mendengar kata-katamu${name}. Ceritakan sedikit lebih banyak, aku penasaran.`,
    "Hmm... menarik. Kalau aku sedang berada di sungai, mungkin aku akan memikirkannya sambil berenang.",
    "Aku mengerti sebagian. Bisa kamu tanyakan dengan cara lain? Moncongku panjang, tapi daya tangkap bahasaku masih belajar.",
    `Oh begitu${name}. Lalu, apa yang paling menarik dari itu menurutmu?`,
  ]);
}

function handleUserInput(text) {
  if (!text || state.phase !== "calling" || state.thinking || state.speaking) return;
  stopRecognition();
  state.thinking = true;
  showCaption("Kamu", text, true);
  setCallStatus("Spino sedang berpikir", "thinking");
  const reply = makeReply(text);
  setTimeout(() => {
    if (state.phase !== "calling") return;
    state.thinking = false;
    speak(reply);
  }, 520 + Math.random() * 650);
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  chatInput.value = "";
  handleUserInput(text);
});

// ---------- Alur panggilan ----------
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function updateTimer() {
  state.duration = Math.floor((Date.now() - state.callStartedAt) / 1000);
  callTimer.textContent = formatTime(state.duration);
}

function acceptCall() {
  ensureAudio();
  stopRingtone();
  speechSynthesis.cancel();
  state.phase = "calling";
  state.muted = false;
  state.thinking = false;
  app.className = "app calling";
  incomingScreen.hidden = true;
  endedScreen.hidden = true;
  callScreen.hidden = false;
  state.callStartedAt = Date.now();
  state.duration = 0;
  callTimer.textContent = "00:00";
  state.timerId = setInterval(updateTimer, 1000);
  setCallStatus("tersambung");
  setTimeout(() => {
    if (state.phase === "calling") speak("Halo! Akhirnya kamu angkat juga. Aku Spino. Coba bilang halo, aku bisa mendengarmu.");
  }, 1050);
}

function endCall() {
  if (state.phase === "ended") return;
  stopRingtone();
  stopRecognition();
  speechSynthesis.cancel();
  state.speaking = false;
  state.thinking = false;
  clearInterval(state.timerId);
  if (state.callStartedAt) updateTimer();
  state.phase = "ended";
  app.className = "app ended";
  incomingScreen.hidden = true;
  callScreen.hidden = true;
  endedScreen.hidden = false;
  endedDuration.textContent = formatTime(state.duration);
}

function redial() {
  state.phase = "incoming";
  state.callStartedAt = 0;
  state.duration = 0;
  state.muted = false;
  muteBtn.setAttribute("aria-pressed", "false");
  muteLabel.textContent = "Mikrofon";
  app.className = "app incoming";
  incomingScreen.hidden = false;
  callScreen.hidden = true;
  endedScreen.hidden = true;
  soundHint.hidden = false;
  setTimeout(startRingtone, 300);
}

acceptBtn.addEventListener("click", acceptCall);
declineBtn.addEventListener("click", endCall);
hangupBtn.addEventListener("click", endCall);
redialBtn.addEventListener("click", redial);

muteBtn.addEventListener("click", () => {
  state.muted = !state.muted;
  muteBtn.setAttribute("aria-pressed", String(state.muted));
  muteLabel.textContent = state.muted ? "Mik mati" : "Mikrofon";
  if (state.muted) {
    stopRecognition();
    app.classList.add("keyboard-mode");
    setCallStatus("mikrofon dimatikan");
  } else {
    app.classList.remove("keyboard-mode");
    setCallStatus("mendengarkanmu");
    startRecognition();
  }
});

function showToast(message, duration = 3600) {
  clearTimeout(state.toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  state.toastTimer = setTimeout(() => { toast.hidden = true; }, duration);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopRingtone();
    stopRecognition();
  } else if (state.phase === "calling" && !state.muted && !state.speaking) {
    startRecognition();
  }
});

window.addEventListener("beforeunload", () => {
  speechSynthesis.cancel();
  stopRecognition();
});
