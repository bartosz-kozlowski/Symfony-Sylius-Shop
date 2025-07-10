// import * as THREE from 'three';
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
// import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
//
// document.addEventListener('DOMContentLoaded', () => {
//   console.log('loaded');
//
//   const canvas = document.getElementById('viewerCanvas');
//   const picker = document.getElementById('colorPicker');
//   const exportBtn = document.getElementById('exportBtn');
//   const placeholder = document.getElementById('placeholder');
//   const saveBtn = document.getElementById('saveBtn');
//   const productLinks = document.querySelectorAll('#productList a');
//
//   const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
//   renderer.setSize(canvas.clientWidth, canvas.clientHeight);
//   renderer.setPixelRatio(window.devicePixelRatio);
//   renderer.outputEncoding = THREE.sRGBEncoding;
//   renderer.toneMapping = THREE.ACESFilmicToneMapping;
//
//   const scene = new THREE.Scene();
//   const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
//   camera.position.set(0, 1.5, 3);
//
//   const controls = new OrbitControls(camera, renderer.domElement);
//   controls.target.set(0, 1, 0);
//   controls.update();
//
//   window.addEventListener('resize', () => {
//     renderer.setSize(canvas.clientWidth, canvas.clientHeight);
//     camera.aspect = canvas.clientWidth / canvas.clientHeight;
//     camera.updateProjectionMatrix();
//   });
//
//   let currentModel = null;
//   let currentMaterials = [];
//
//   // HDR do oświetlenia (bez tła)
//   new RGBELoader().load('/media/hdr/studio_small_03_4k.hdr', (hdr) => {
//     hdr.mapping = THREE.EquirectangularReflectionMapping;
//     scene.environment = hdr;
//     scene.background = null;
//   });
//
//   function animate() {
//     requestAnimationFrame(animate);
//     controls.update();
//     renderer.render(scene, camera);
//   }
//
//   animate();
//
//   const loader = new GLTFLoader();
//   function showSaveButton() {
//     saveBtn.classList.remove('d-none');
//   }
//
//   saveBtn.addEventListener('click', () => {
//     if (!currentModel) return;
//
//     const filename = currentModel.userData.filename || 'updated.glb';
//
//     // Stwórz kopię modelu tylko do eksportu
//     const exportModel = currentModel.clone(true);
//
//     exportModel.traverse((child) => {
//       if (child.isMesh && child.material) {
//         const mat = child.material;
//
//         // Jeżeli materiał ma teksturę, zapisz kolor jako baseColorFactor (tint)
//         if (mat.map && mat.color) {
//           mat.userData = mat.userData || {};
//           mat.userData.gltfExtensions = {
//             KHR_materials_pbrSpecularGlossiness: {
//               diffuseFactor: [mat.color.r, mat.color.g, mat.color.b, 1.0]
//             }
//           };
//         }
//       }
//     });
//
//     const exporter = new GLTFExporter();
//     exporter.parse(
//       exportModel,
//       (result) => {
//         const blob = new Blob([result], { type: 'model/gltf-binary' });
//
//         const formData = new FormData();
//         formData.append('file', blob, filename);
//         formData.append('filename', filename);
//
//         fetch('/api/upload-model', {
//           method: 'POST',
//           body: formData,
//         })
//           .then((res) => {
//             if (!res.ok) throw new Error('Upload failed');
//             return res.json();
//           })
//           .then((data) => {
//             alert(`Model zapisany jako ${filename}`);
//             console.log('Zapisany model:', data);
//           })
//           .catch((err) => {
//             console.error(err);
//             alert('Błąd podczas zapisu modelu');
//           });
//       },
//       { binary: true }
//     );
//   });
//
//
//   function loadModel(modelUrl) {
//     if (currentModel) {
//       scene.remove(currentModel);
//     }
//
//     loader.load(modelUrl, (gltf) => {
//       currentModel = gltf.scene;
//       const filename = modelUrl.split('/').pop();
//       currentModel.userData.filename = filename;
//       currentMaterials = [];
//
//       // Normalizacja modelu na podstawie wysokości (jak w over.js)
//       const bbox = new THREE.Box3().setFromObject(currentModel);
//       const size = new THREE.Vector3();
//       bbox.getSize(size);
//       const scale = 1.0 / size.y;  // tylko wysokość
//       currentModel.scale.setScalar(scale);
//
//       // Po skalowaniu, centrujemy model na osi Y = 0
//       const newBbox = new THREE.Box3().setFromObject(currentModel);
//       const center = new THREE.Vector3();
//       newBbox.getCenter(center);
//       currentModel.position.sub(center); // środek do (0,0,0)
//
//       // Podnosimy model tak, by stał na ziemi (Y=0)
//       const updatedBbox = new THREE.Box3().setFromObject(currentModel);
//       const minY = updatedBbox.min.y;
//       currentModel.position.y -= minY;
//
//       // Kamera jak w over.js
//       camera.fov = 75;
//       camera.aspect = canvas.clientWidth / canvas.clientHeight;
//       camera.near = 0.1;
//       camera.far = 1000;
//       camera.position.set(0, 1.4, 3);
//       camera.updateProjectionMatrix();
//
//       // OrbitControls – cel na środku modelu
//       controls.target.set(0, 0.5, 0);
//       controls.maxDistance = 20;
//       controls.minDistance = 1;
//       controls.update();
//
//       currentModel.traverse((child) => {
//         if (child.isMesh && child.material && child.material.color) {
//           child.material.envMapIntensity = 1.5;
//           child.material.vertexColors = false;
//           child.material.colorWrite = true;
//           child.material.needsUpdate = true;
//           currentMaterials.push(child.material);
//         }
//       });
//
//       scene.add(currentModel);
//       showSaveButton();
//     });
//   }
//
//   productLinks.forEach((link) => {
//     link.addEventListener('click', (e) => {
//       e.preventDefault();
//       const modelUrl = link.getAttribute('data-model');
//       if (modelUrl) {
//         placeholder.style.display = 'none';
//         exportBtn.classList.remove('d-none');
//         loadModel(modelUrl);
//       }
//     });
//   });
//
//   picker.addEventListener('input', () => {
//     const hex = picker.value;
//     const r = parseInt(hex.slice(1, 3), 16) / 255;
//     const g = parseInt(hex.slice(3, 5), 16) / 255;
//     const b = parseInt(hex.slice(5, 7), 16) / 255;
//
//     currentMaterials.forEach((mat) => {
//       if (mat && mat.color) {
//         mat.color.setRGB(r, g, b);
//         mat.needsUpdate = true;
//       }
//     });
//   });
//
//   window.exportGLB = () => {
//     if (!currentModel) return;
//     const exporter = new GLTFExporter();
//     exporter.parse(
//       currentModel,
//       (result) => {
//         const blob = new Blob([result], { type: 'model/gltf-binary' });
//         const url = URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         a.href = url;
//         a.download = 'export.glb';
//         a.click();
//       },
//       { binary: true }
//     );
//   };
// });
