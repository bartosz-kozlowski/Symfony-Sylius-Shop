import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

document.addEventListener('DOMContentLoaded', () => {
  /* ---------- DOM ---------- */
  const cartViewer  = document.getElementById('cartViewer');
  const cartList    = document.getElementById('cartList');
  const checkoutBtn = document.getElementById('checkoutBtn');

  /* ---------- 3-D globals ---------- */
  let cartScene, cartCamera, cartRenderer, cartControls;
  const cartModelMap = new Map();        // productId ➜ { model, variantCode, productName, modelPath }
  let placedX = -3;
  const groundY = -1.2;

  /* ---------- localStorage helpers ---------- */
  function saveCartToStorage() {
    const data = Array.from(cartModelMap.entries()).map(([productId, { variantCode, productName, modelPath }]) => ({
      productId,
      variantCode,
      productName,
      modelPath,
    }));
    localStorage.setItem('cart', JSON.stringify(data));
  }

  function loadCartFromStorage() {
    const saved = JSON.parse(localStorage.getItem('cart') || '[]');
    if (!saved.length) return;

    saved.forEach(({ productId, variantCode, productName, modelPath }) => {
      if (!modelPath || cartModelMap.has(productId)) return;

      loadModel(modelPath, productId, (model) => {
        normalizeModel(model, 1);
        model.position.set(placedX, 5, 0);
        model.userData.fallSpeed = 0.03;
        cartScene.add(model);

        cartModelMap.set(productId, { model, variantCode, productName, modelPath });
        placedX += 2;

        addProductLine(productId, productName);
        checkoutBtn.classList.remove('d-none');
        relayoutModels();
      });
    });
  }

  /* ---------- 3-D viewer ---------- */
  function initViewer(container) {
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
    scene.add(hemi);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = -0.4;
    controls.target.set(0, 0.5, 0);
    controls.update();

    /* HDRI */
    const pmrem = new THREE.PMREMGenerator(renderer);
    new RGBELoader().load('/media/hdr/neutral.hdr', (hdr) => {
      const env = pmrem.fromEquirectangular(hdr).texture;
      scene.environment = env;
      scene.background   = env;
      hdr.dispose(); pmrem.dispose();
    });

    /* animation loop */
    (function animate() {
      requestAnimationFrame(animate);
      controls.update();
      scene.traverse(obj => {
        if (!obj.userData.fallSpeed) return;
        const bottom = obj.position.y - 0.5;
        if (bottom <= groundY) {
          obj.position.y = groundY + 0.5;
          obj.userData.fallSpeed = 0;
        } else {
          obj.position.y -= obj.userData.fallSpeed;
        }
      });
      renderer.render(scene, camera);
    })();

    /* resize */
    window.addEventListener('resize', () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });

    return { scene, camera, renderer, controls };
  }

  /* ---------- helpers ---------- */
  function normalizeModel(model, targetHeight = 1) {
    const bbox = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    model.scale.setScalar(targetHeight / size.y);
  }

  function loadModel(path, id, onLoad) {
    new GLTFLoader().load(path, (gltf) => {
      gltf.scene.userData.productId = id;
      onLoad(gltf.scene);
    }, undefined, err => console.error('GLTF error', err));
  }

  function addProductLine(productId, productName) {
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
      <button class="btn btn-sm btn-outline-danger remove-from-cart" data-id="${productId}">
        <i class="bi bi-trash"></i><span class="d-none d-sm-inline"> Usuń</span>
      </button>`;
    ul.appendChild(li);
  }

  function relayoutModels() {
    let x = -3, spacing = 2;
    for (const { model } of cartModelMap.values()) { model.position.x = x; x += spacing; }
    placedX = x;
    const mid = -3 + (cartModelMap.size - 1) * spacing / 2;
    cartControls.target.set(mid, 0.5, 0);
    cartCamera.position.set(mid, 1.8, 5);
    cartControls.update();
  }

  /* ---------- initialisation ---------- */
  ({ scene: cartScene, camera: cartCamera, renderer: cartRenderer, controls: cartControls } = initViewer(cartViewer));

  /* po pełnym załadowaniu strony (html + img) */
  window.addEventListener('load', () => setTimeout(loadCartFromStorage, 200));

  /* ---------- UI handlers ---------- */
  document.querySelectorAll('.add-to-stack').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const a = e.currentTarget.closest('li').querySelector('a');
      const { model: modelPath, productId, productName, variantId: variantCode } = a.dataset;
      if (!modelPath || cartModelMap.has(productId)) return;

      loadModel(modelPath, productId, (model) => {
        normalizeModel(model, 1);
        model.position.set(placedX, 5, 0);
        model.userData.fallSpeed = 0.03;
        cartScene.add(model);

        cartModelMap.set(productId, { model, variantCode, productName, modelPath });
        saveCartToStorage();

        placedX += 2;
        relayoutModels();
        addProductLine(productId, productName);
        checkoutBtn.classList.remove('d-none');
      });
    });
  });

  /* remove */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-from-cart');
    if (!btn) return;
    const id = btn.dataset.id;
    btn.closest('li')?.remove();

    const entry = cartModelMap.get(id);
    if (entry) {
      cartScene.remove(entry.model);
      cartModelMap.delete(id);
      saveCartToStorage();
      relayoutModels();
    }

    if (cartModelMap.size === 0) {
      cartList.innerHTML = 'Brak dodanych produktów';
      checkoutBtn.classList.add('d-none');
      placedX = -3;
    }
  });

  /* checkout */
  checkoutBtn.addEventListener('click', () => {
    if (!cartModelMap.size) return;
    const payload = btoa(encodeURIComponent(JSON.stringify(
      Array.from(cartModelMap.entries()).map(([id, { variantCode, productName }]) => ({
        productId: id,
        variantCode,
        productName,
        quantity: 1
      }))
    )));
    window.location.href = `/custom-add-to-cart?cart=${payload}`;
  });

  /* tooltips */
  [...document.querySelectorAll('[data-bs-toggle="tooltip"]')]
    .forEach(el => new bootstrap.Tooltip(el));
});
