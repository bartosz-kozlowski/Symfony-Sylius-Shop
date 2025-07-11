import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

document.addEventListener('DOMContentLoaded', () => {
  const cartViewer = document.getElementById('cartViewer');
  const cartList = document.getElementById('cartList');
  const checkoutBtn = document.getElementById('checkoutBtn');


  let cartScene, cartCamera, cartRenderer, cartControls;
  const cartModelMap = new Map();
  let placedX = -3;
  const groundY = -1.2; // wysokość, na której obiekty mają się zatrzymać

  function initViewer(container) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
    scene.add(light);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 15;

    controls.autoRotate = true;

    controls.enableZoom = true;    // zoom dwoma palcami
    controls.enablePan = true;     // przesuwanie dwoma palcami
    controls.enableRotate = true;  // obracanie jednym palcem

    controls.autoRotateSpeed = -0.4;
    controls.target.set(0, 0.5, 0);
    controls.update();

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    new RGBELoader()
      .load('/media/hdr/neutral.hdr', function (hdrTexture) {
        const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;

        scene.environment = envMap;
        scene.background = envMap;

        hdrTexture.dispose();
        pmremGenerator.dispose();
      });

    function animate() {
      requestAnimationFrame(animate);
      controls.update();

      scene.traverse(obj => {
        if (!obj.userData.fallSpeed) return;

        const modelBottom = obj.position.y - 0.5;
        if (modelBottom <= groundY) {
          obj.position.y = groundY + 0.5;
          obj.userData.fallSpeed = 0;
        } else {
          obj.position.y -= obj.userData.fallSpeed;
        }
      });

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });

    let autoRotateTimeout;

    renderer.domElement.addEventListener('pointerdown', () => {
      controls.autoRotate = false;
      clearTimeout(autoRotateTimeout);
    });

    renderer.domElement.addEventListener('pointerup', () => {
      autoRotateTimeout = setTimeout(() => {
        controls.autoRotate = true;
      }, 2000);
    });

    return { scene, camera, renderer, controls };
  }

  function normalizeModel(model, targetHeight = 1) {
    const bbox = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const scale = targetHeight / size.y;
    model.scale.setScalar(scale);
  }

  function encodeCartToQueryParam(cartMap) {
    const payload = [];

    for (const [productId, { variantCode, productName }] of cartMap.entries()) {
      payload.push({ productId, variantCode, productName, quantity: 1 });
    }

    return btoa(encodeURIComponent(JSON.stringify(payload)));
  }

  function loadModel(path, id, onLoad) {
    const loader = new GLTFLoader();
    loader.load(path, gltf => {
      gltf.scene.userData.productId = id;
      onLoad(gltf.scene);
    }, undefined, error => {
      console.error('Błąd ładowania modelu:', error);
    });
  }
  function updateCamera() {
    if (cartModelMap.size === 0) {
      cartControls.target.set(0, 0.5, 0);
      cartCamera.position.set(0, 1.6, 4.5);
    } else {
      const spacing = 2;
      const midX = -3 + (cartModelMap.size - 1) * spacing / 2;
      cartControls.target.set(midX, 0.5, 0);
      cartCamera.position.set(midX, 1.6, 4.5);
    }
    cartControls.update();
  }

  function relayoutModels() {
    let x = -3;                 // punkt startowy
    const spacing = 2;          // odstęp między modelami

    for (const { model } of cartModelMap.values()) {
      model.position.x = x;
      x += spacing;
    }

    placedX = x;                // nową wartość dla kolejnych

    // przesuwamy cel kamery tak, aby patrzyła na środek
    const midX = -3 + (cartModelMap.size - 1) * spacing / 2;
    cartControls.target.set(midX, 0.5, 0);
    cartCamera.position.set(midX, 1.8, 5);
    cartControls.update();
    updateCamera();
  }


  ({ scene: cartScene, camera: cartCamera, renderer: cartRenderer, controls: cartControls } = initViewer(cartViewer));

  checkoutBtn.addEventListener('click', () => {
    if (cartModelMap.size === 0) return;

    const encodedCart = encodeCartToQueryParam(cartModelMap);
    window.location.href = `/custom-add-to-cart?cart=${encodedCart}`;
  });


  document.querySelectorAll('.add-to-stack').forEach(button => {
    button.addEventListener('click', async e => {
      const anchor = e.target.closest('li').querySelector('a');
      const modelPath = anchor.dataset.model;
      const productId = anchor.dataset.productId;
      const productName = anchor.dataset.productName;
      const variantCode = anchor.dataset.variantId; // Zakładamy, że to kod wariantu

      if (cartModelMap.has(productId)) return;

      loadModel(modelPath, productId, model => {
        normalizeModel(model, 1);
        model.position.set(placedX, 5, 0);
        model.userData.fallSpeed = 0.03;
        cartScene.add(model);
        cartModelMap.set(productId, { model, variantCode, productName });
        placedX += 2;
        // cartControls.target.set(placedX - 1, 0.5, 0);
        // cartCamera.position.set(placedX - 1, 1.8, 5);
        updateCamera();
        cartControls.update();

        if (!cartList.querySelector('ul')) {
          const ul = document.createElement('ul');
          ul.className = 'list-group list-group-flush';
          cartList.innerHTML = '';
          cartList.appendChild(ul);
        }

        const ul = cartList.querySelector('ul');
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `
        <span class="me-2">${productName}</span>
        <button class="btn btn-sm btn-outline-danger d-flex align-items-center gap-1 remove-from-cart" data-id="${productId}" title="Usuń z zestawu">
          <i class="bi bi-trash"></i><span class="d-none d-sm-inline">Usuń</span>
        </button>`;
        ul.appendChild(li);

        checkoutBtn.classList.remove('d-none');
      });
    });
  });

  document.addEventListener('click', function (e) {
    const removeBtn = e.target.closest('.remove-from-cart');
    if (removeBtn) {
      const productId = removeBtn.dataset.id;

      const li = removeBtn.closest('li');
      li.remove();

      const entry = cartModelMap.get(productId);
      if (entry) {
        cartScene.remove(entry.model);
        cartModelMap.delete(productId);
      }

      const remainingItems = cartList.querySelectorAll('li');
      if (remainingItems.length === 0) {
        cartList.innerHTML = 'Brak dodanych produktów';
        checkoutBtn.classList.add('d-none');
        placedX = -3;
        cartControls.target.set(-4, 0.5, 0);
        cartCamera.position.set(-4, 1.6, 4.5);
        cartControls.update();
      } else {
        relayoutModels();
      }
    }
  });

  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(el => new bootstrap.Tooltip(el));
});
