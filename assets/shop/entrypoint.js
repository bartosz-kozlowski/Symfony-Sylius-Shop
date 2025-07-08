import '@vendor/sylius/mollie-plugin/assets/shop/entrypoint';
import './bootstrap.js';

// In this file you can import assets like images or stylesheets
console.log('Hello Webpack Encore! Edit me in assets/shop/entrypoint.js');
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

document.addEventListener('DOMContentLoaded', () => {
  const cartViewer = document.getElementById('cartViewer');
  const cartList = document.getElementById('cartList');
  const checkoutBtn = document.getElementById('checkoutBtn');

  let cartScene, cartCamera, cartRenderer, cartControls;

  const cartModelMap = new Map(); // Mapowanie ID produktu → obiekt 3D

  function initViewer(container) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
    scene.add(light);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controls.update();

    function animate() {
      requestAnimationFrame(animate);
      controls.update();

      // Opadanie produktów
      scene.traverse(obj => {
        if (!obj.userData.fallSpeed) return;

        if (!basketBox) return;

        const modelBottom = obj.position.y - 0.5;
        const basketY = basketBox.max.y - 4.85;

        if (modelBottom <= basketY) {
          obj.position.y = basketY + 0.5;
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

    return { scene, camera, renderer, controls };
  }
  function normalizeModel(model, targetHeight = 1) {
    const bbox = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    const scale = targetHeight / size.y; // y = wysokość
    model.scale.setScalar(scale); // jednolita skala
  }
  function loadModel(path, id, onLoad) {
    const loader = new GLTFLoader();
    loader.load(path, gltf => {
      gltf.scene.userData.productId = id; // zapamiętaj ID
      onLoad(gltf.scene);
    }, undefined, error => {
      console.error('Błąd ładowania modelu:', error);
    });
  }

  let basketBox = null;
  ({ scene: cartScene, camera: cartCamera, renderer: cartRenderer, controls: cartControls } = initViewer(cartViewer));
  loadModel('/media/models/trolley.gltf', 'basket', model => {
    model.name = 'basket';
    model.position.set(0, -1.5, 0); // pozycja koszyka
    model.scale.set(6, 6, 6);
    cartScene.add(model);
    const box = new THREE.Box3().setFromObject(model);
    basketBox = box; // zapamiętaj do kolizji
  });
  document.querySelectorAll('.add-to-stack').forEach(button => {
    button.addEventListener('click', e => {
      const anchor = e.target.closest('li').querySelector('a');
      const modelPath = anchor.dataset.model;
      const productId = anchor.dataset.productId;
      const productName = anchor.dataset.productName;

      // Unikaj duplikatów
      if (cartModelMap.has(productId)) return;

      loadModel(modelPath, productId, model => {
        normalizeModel(model, 1);
        const spread = 1.5; // rozrzut
        const offsetX = (Math.random() - 0.5) * spread * 1.2;
        const offsetZ = (Math.random() - 0.5) * spread * 1.2;
        model.position.set(offsetX, 10, offsetZ);
        model.userData.fallSpeed = 0.04; // prędkość opadania
        cartScene.add(model);
        cartModelMap.set(productId, model);

        if (!cartList.querySelector('ul')) {
          const ul = document.createElement('ul');
          ul.className = 'list-group list-group-flush';
          cartList.innerHTML = '';
          cartList.appendChild(ul);
        }

        const ul = cartList.querySelector('ul');
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `<span>${productName}</span>
        <button class="btn btn-sm btn-outline-danger ms-auto remove-from-cart" data-id="${productId}">&times;</button>`;
        ul.appendChild(li);

        checkoutBtn.classList.remove('d-none');
      });
    });
  });

  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('remove-from-cart')) {
      const productId = e.target.dataset.id;

      // Usuń z DOM
      const li = e.target.closest('li');
      li.remove();

      // Usuń z Three.js sceny
      const model = cartModelMap.get(productId);
      if (model) {
        cartScene.remove(model);
        cartModelMap.delete(productId);
      }

      // Sprawdź, czy lista jest pusta
      const remainingItems = cartList.querySelectorAll('li');
      if (remainingItems.length === 0) {
        cartList.innerHTML = 'Brak dodanych produktów';
        checkoutBtn.classList.add('d-none');
      }
    }
  });
});
