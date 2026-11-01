import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RotateCcw,
  Compass,
  AlertTriangle,
  Flame,
} from 'lucide-react';

interface Helmet3DViewerProps {
  accelX?: number;
  accelY?: number;
  accelZ?: number;
  impactAlert?: boolean;
  gasAlert?: boolean;
  sosAlert?: boolean;
  highTempAlert?: boolean;
  peakG?: number;
  pitchDeg: number;
  rollDeg: number;
  totalG: number;
  invertPitch: boolean;
  invertRoll: boolean;
  onCalibrate: () => void;
  onToggleInvertPitch: () => void;
  onToggleInvertRoll: () => void;
  onResetCalibration: () => void;
}

export type HelmetColor = 'yellow' | 'orange' | 'white' | 'blue' | 'black';

const COLOR_PRESETS: Record<HelmetColor, { name: string; hex: number; bg: string }> = {
  yellow: { name: 'Safety Yellow', hex: 0xf59e0b, bg: 'bg-amber-500' },
  orange: { name: 'High-Vis Orange', hex: 0xf97316, bg: 'bg-orange-500' },
  white: { name: 'Engineer White', hex: 0xf1f5f9, bg: 'bg-slate-100' },
  blue: { name: 'Supervisor Blue', hex: 0x0284c7, bg: 'bg-sky-500' },
  black: { name: 'Stealth Carbon', hex: 0x1e293b, bg: 'bg-slate-800' },
};

export const Helmet3DViewer: React.FC<Helmet3DViewerProps> = ({
  accelX = 0,
  accelY = 0,
  accelZ = 1,
  impactAlert = false,
  gasAlert = false,
  sosAlert = false,
  highTempAlert = false,
  peakG = 1.0,
  pitchDeg,
  rollDeg,
  totalG,
  invertPitch,
  invertRoll,
  onCalibrate,
  onToggleInvertPitch,
  onToggleInvertRoll,
  onResetCalibration,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedColor, setSelectedColor] = useState<HelmetColor>('yellow');
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // References for Three.js instance
  const helmetMaterialsRef = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const orientationGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const shakeRef = useRef<number>(0);

  // Target orientation values
  const targetPitchRef = useRef<number>(0);
  const targetRollRef = useRef<number>(0);

  // Update target pitch & roll from props
  useEffect(() => {
    // In Three.js: X-axis rotation is pitch, Z-axis rotation is roll
    const pRad = (pitchDeg * Math.PI) / 180;
    const rRad = (rollDeg * Math.PI) / 180;
    targetPitchRef.current = pRad;
    targetRollRef.current = rRad;
  }, [pitchDeg, rollDeg]);

  // Handle impact vibration shake trigger
  useEffect(() => {
    if (impactAlert || peakG > 2.5) {
      shakeRef.current = 1.0;
    }
  }, [impactAlert, peakG]);

  // Update material color when preset changes or when in alert state
  useEffect(() => {
    const preset = COLOR_PRESETS[selectedColor];
    helmetMaterialsRef.current.forEach((mat) => {
      if (sosAlert) {
        mat.color.setHex(0xdc2626); // Emergency Red
        mat.emissive.setHex(0x991b1b);
        mat.emissiveIntensity = 0.85;
      } else if (impactAlert) {
        mat.color.setHex(0xef4444); // Hazard red
        mat.emissive.setHex(0x7f1d1d);
        mat.emissiveIntensity = 0.6;
      } else if (gasAlert) {
        mat.color.setHex(0xd97706); // Warning amber
        mat.emissive.setHex(0x78350f);
        mat.emissiveIntensity = 0.4;
      } else {
        mat.color.setHex(preset.hex);
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
      mat.needsUpdate = true;
    });
  }, [selectedColor, impactAlert, gasAlert, sosAlert]);

  // Reset Camera Position
  const handleResetCamera = useCallback(() => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 1.4, 3.8);
      controlsRef.current.target.set(0, 0.1, 0);
      controlsRef.current.update();
    }
  }, []);

  // Main Three.js setup & render loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 3.8);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // 4. OrbitControls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.8;
    controls.maxDistance = 7.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.target.set(0, 0.1, 0);
    controlsRef.current = controls;

    // 5. Lighting Setup for Ultra-Realistic PBR
    // Warm Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Main Studio Directional Key Light
    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.6);
    keyLight.position.set(3.5, 6, 4.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 15;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Cool Fill Light for depth
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.8);
    fillLight.position.set(-4, 3, -3);
    scene.add(fillLight);

    // Cyan High-Tech Rim Light for edge silhouette highlights
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rimLight.position.set(0, 4, -5);
    scene.add(rimLight);

    // Soft overhead dome spotlight
    const topSpot = new THREE.SpotLight(0xffedd5, 1.0, 10, Math.PI / 4, 0.4);
    topSpot.position.set(0, 5, 0);
    scene.add(topSpot);

    // 6. High-Tech Industrial HUD Pedestal & Ground Plane
    const groundGroup = new THREE.Group();
    groundGroup.position.y = -0.55;

    // Circular Grid
    const ringGeo1 = new THREE.RingGeometry(0.3, 1.8, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = -Math.PI / 2;
    groundGroup.add(ring1);

    // Outer range border ring
    const outerBorder = new THREE.RingGeometry(1.78, 1.82, 64);
    const outerBorderMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const outerRing = new THREE.Mesh(outerBorder, outerBorderMat);
    outerRing.rotation.x = -Math.PI / 2;
    groundGroup.add(outerRing);

    // Inner target crosshair
    const innerRingGeo = new THREE.RingGeometry(0.58, 0.61, 48);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    groundGroup.add(innerRing);

    // Radial spokes
    const spokeMat = new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.25 });
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const points = [
        new THREE.Vector3(Math.cos(angle) * 0.6, 0, Math.sin(angle) * 0.6),
        new THREE.Vector3(Math.cos(angle) * 1.8, 0, Math.sin(angle) * 1.8),
      ];
      const spokeGeo = new THREE.BufferGeometry().setFromPoints(points);
      groundGroup.add(new THREE.Line(spokeGeo, spokeMat));
    }

    // Soft Contact Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.01;
    shadowPlane.receiveShadow = true;
    groundGroup.add(shadowPlane);

    scene.add(groundGroup);

    // 7. Orientation Master Pivot Group
    const orientationGroup = new THREE.Group();
    orientationGroup.position.set(0, 0.15, 0);
    scene.add(orientationGroup);
    orientationGroupRef.current = orientationGroup;

    // 8. Load the Construction Helmet GLB model
    const loader = new GLTFLoader();
    const modelUrl = '/construction_helmet.glb';

    helmetMaterialsRef.current = [];

    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;

        // Calculate bounding box for exact origin centering
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Center model within its own parent container
        const helmetContainer = new THREE.Group();
        helmetContainer.add(model);

        // Normalize scale: target width ~ 1.95 units
        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = 1.95 / (maxDim || 1);
        helmetContainer.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // Reposition model inside container so center aligns with origin
        model.position.set(-center.x, -center.y, -center.z);

        // Apply high-fidelity PBR Realistic Material
        const preset = COLOR_PRESETS[selectedColor];
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const pbrMat = new THREE.MeshPhysicalMaterial({
              color: preset.hex,
              roughness: 0.34,
              metalness: 0.05,
              clearcoat: 0.45,
              clearcoatRoughness: 0.15,
              reflectivity: 0.6,
              ior: 1.52, // Optical index for polycarbonate safety plastic
            });

            mesh.material = pbrMat;
            helmetMaterialsRef.current.push(pbrMat);
          }
        });

        orientationGroup.add(helmetContainer);
        setModelLoaded(true);
        setLoadError(null);
      },
      undefined,
      (err) => {
        console.error('Error loading GLTF /construction_helmet.glb:', err);
        setLoadError('Loading GLTF failed. Displaying procedural realistic fallback.');
        // Fallback procedural realistic helmet if GLB is unavailable
        createProceduralHelmet(orientationGroup, selectedColor, helmetMaterialsRef);
        setModelLoaded(true);
      }
    );

    // 9. Resize Observer for dynamic responsiveness
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 10. Animation Loop with Smooth Interpolation
    let curP = 0;
    let curR = 0;
    let animFrameId: number;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);

      // Smooth interpolation (lerp) towards target pitch & roll
      const targetP = targetPitchRef.current;
      const targetR = targetRollRef.current;

      curP += (targetP - curP) * 0.12;
      curR += (targetR - curR) * 0.12;

      // Handle impact shake decay
      if (shakeRef.current > 0.01) {
        shakeRef.current *= 0.88;
      } else {
        shakeRef.current = 0;
      }
      const shakeY = Math.sin(Date.now() * 0.05) * shakeRef.current * 0.1;

      if (orientationGroupRef.current) {
        orientationGroupRef.current.rotation.x = curP;
        orientationGroupRef.current.rotation.z = -curR;
        orientationGroupRef.current.position.y = 0.15 + shakeY;
      }

      // Rotate ground compass ring slowly for futuristic HUD feel
      ring1.rotation.z += 0.002;
      outerRing.rotation.z -= 0.001;

      // Orbit controls auto-rotate if enabled
      if (autoRotate && controlsRef.current) {
        controlsRef.current.autoRotate = true;
        controlsRef.current.autoRotateSpeed = 1.5;
      } else if (controlsRef.current) {
        controlsRef.current.autoRotate = false;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [autoRotate, selectedColor]);

  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 border border-slate-800 shadow-2xl flex flex-col h-[520px]">
      {/* Top Floating HUD Status Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-2 pointer-events-auto">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-xs">
            <Compass className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-mono text-cyan-300 font-bold">MPU6050 3D Vector</span>
          </div>

          {sosAlert && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-600 border border-white text-white text-xs font-bold animate-bounce shadow-lg shadow-rose-950/80">
              <AlertTriangle className="h-3.5 w-3.5 text-white" />
              <span>EMERGENCY SOS ACTIVE (G26)</span>
            </div>
          )}

          {impactAlert && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-950/90 border border-rose-600 text-rose-300 text-xs font-bold animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
              <span>FALL / IMPACT DETECTED ({peakG.toFixed(2)}g)</span>
            </div>
          )}

          {gasAlert && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-950/90 border border-amber-600 text-amber-300 text-xs font-bold animate-pulse">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>CO GAS ALERT</span>
            </div>
          )}

          {highTempAlert && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-orange-950/90 border border-orange-600 text-orange-300 text-xs font-bold animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
              <span>THERMAL ALERT</span>
            </div>
          )}
        </div>

        {/* View Controls */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition backdrop-blur-md ${
              autoRotate
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Toggle 360° Auto Rotation"
          >
            Auto-Rotate
          </button>
          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white backdrop-blur-md transition"
            title="Reset Camera View"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Area */}
      <div ref={containerRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing relative">
        {!modelLoaded && !loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 z-20 bg-slate-950/60 backdrop-blur-sm">
            <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-cyan-300 font-mono">Loading realistic 3D helmet model...</p>
          </div>
        )}

        {loadError && (
          <div className="absolute top-16 left-4 right-4 z-20 p-2 rounded-xl bg-amber-950/80 border border-amber-800 text-[11px] text-amber-200 text-center font-mono">
            {loadError}
          </div>
        )}
      </div>

      {/* Floating Bottom HUD & Quick Action Bar */}
      <div className="p-4 bg-slate-950/80 backdrop-blur-md border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 z-10">
        {/* Dynamic Angles and G-Force Display */}
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">PITCH:</span>
            <span className={`font-bold ${Math.abs(pitchDeg) > 45 ? 'text-amber-400' : 'text-cyan-400'}`}>
              {pitchDeg > 0 ? `+${pitchDeg}` : pitchDeg}°
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">ROLL:</span>
            <span className={`font-bold ${Math.abs(rollDeg) > 45 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {rollDeg > 0 ? `+${rollDeg}` : rollDeg}°
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">TOTAL G:</span>
            <span className={`font-bold ${totalG > 2.0 ? 'text-rose-400' : 'text-white'}`}>
              {totalG.toFixed(2)} g
            </span>
          </div>

          <div className="hidden lg:flex items-center space-x-1 text-[11px] text-slate-500 font-mono">
            <span>[X:{accelX.toFixed(1)} Y:{accelY.toFixed(1)} Z:{accelZ.toFixed(1)}]</span>
          </div>
        </div>

        {/* Color Palette Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Shell:</span>
          <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            {(Object.keys(COLOR_PRESETS) as HelmetColor[]).map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`w-5 h-5 rounded-full ${COLOR_PRESETS[c].bg} transition transform ${
                  selectedColor === c ? 'ring-2 ring-cyan-400 scale-110' : 'opacity-70 hover:opacity-100'
                }`}
                title={COLOR_PRESETS[c].name}
              />
            ))}
          </div>
        </div>

        {/* Orientation Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onCalibrate}
            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition shadow-md shadow-cyan-950/60"
            title="Set Current Orientation as Level Zero"
          >
            Set Level (Calibrate)
          </button>

          <button
            onClick={onToggleInvertPitch}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
              invertPitch
                ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            Invert Pitch
          </button>

          <button
            onClick={onToggleInvertRoll}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
              invertRoll
                ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            Invert Roll
          </button>

          <button
            onClick={onResetCalibration}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs transition"
            title="Reset calibration offsets"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

// Procedural Fallback Helmet Construction
function createProceduralHelmet(
  group: THREE.Group,
  selectedColor: HelmetColor,
  materialsRef: React.MutableRefObject<THREE.MeshPhysicalMaterial[]>
) {
  const preset = COLOR_PRESETS[selectedColor];

  const shellMat = new THREE.MeshPhysicalMaterial({
    color: preset.hex,
    roughness: 0.32,
    metalness: 0.08,
    clearcoat: 0.45,
    clearcoatRoughness: 0.15,
  });
  materialsRef.current.push(shellMat);

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.7,
  });

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    shellMat
  );
  dome.castShadow = true;

  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(1.08, 1.08, 0.05, 48),
    shellMat
  );
  brim.castShadow = true;

  const visorPeak = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.35, 0.05, 32, 1, false, -Math.PI / 3, (2 * Math.PI) / 3),
    shellMat
  );
  visorPeak.castShadow = true;

  const centerRidge = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.045, 12, 48, Math.PI),
    shellMat
  );
  centerRidge.rotation.y = Math.PI / 2;
  centerRidge.castShadow = true;

  const strap = new THREE.Mesh(
    new THREE.TorusGeometry(0.98, 0.02, 8, 32, Math.PI),
    trimMat
  );
  strap.rotation.x = Math.PI / 2;

  const helmetComposite = new THREE.Group();
  helmetComposite.add(dome, brim, visorPeak, centerRidge, strap);
  helmetComposite.position.y = 0.1;
  group.add(helmetComposite);
}
