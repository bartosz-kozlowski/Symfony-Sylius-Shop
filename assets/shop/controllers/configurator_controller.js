import { Controller } from '@hotwired/stimulus'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

export default class extends Controller {
  static targets = ['viewer', 'list', 'checkout']
  static cartModelMap = new Map()

  connect () {
    if (!this.hasViewerTarget || !this.hasListTarget || !this.hasCheckoutTarget) return
    if (this._connected) return
    this._connected = true

    this.cartModelMap = this.constructor.cartModelMap
    this.placedX = this.cartModelMap.size ? -3 + 2 * this.cartModelMap.size : -3
    this.groundY = -1.2
    this.loadingModelIds = new Set()  // <- ochrona przed duplikatami
    this._loadedFromStorage = this._loadedFromStorage || false

    const { scene, camera, renderer, controls } = this.initViewer(this.viewerTarget)
    this.cartScene    = scene
    this.cartCamera   = camera
    this.cartRenderer = renderer
    this.cartControls = controls

    if (!this._loadedFromStorage) {
      this._loadedFromStorage = true
      this.loadCartFromStorage()
    }

    this.element.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el =>
      new bootstrap.Tooltip(el)
    )
  }

  removeModelCompletely (model) {
    if (!model) return

    model.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose())
        } else {
          obj.material.dispose()
        }
      }
    })

    this.cartScene.remove(model)
  }


  /* ----------- Dodawanie ----------- */
  handleAddClick (e) {
    const btn = e.currentTarget
    const a = btn.closest('li')?.querySelector('a')
    if (!a) return

    const { model: modelPath, productId, productName, variantId: variantCode } = a.dataset
    if (!modelPath || this.cartModelMap.has(productId) || this.loadingModelIds.has(productId)) return

    this.loadingModelIds.add(productId)
    this.cartModelMap.set(productId, { model: null, variantCode, productName, modelPath })

    this.loadModel(modelPath, productId, model => {
      this.loadingModelIds.delete(productId)

      this.normalizeModel(model, 1)
      model.position.set(this.placedX, 5, 0)
      model.userData.fallSpeed = 0.03
      this.cartScene.add(model)

      const existing = this.cartModelMap.get(productId)
      this.cartModelMap.set(productId, { ...existing, model })

      this.saveCartToStorage()
      this.placedX += 2
      this.relayoutModels()
      this.addProductLine(productId, productName)
      this.checkoutTarget.classList.remove('d-none')
    })
  }

  /* ----------- Usuwanie ----------- */
  handleRemoveClick (e) {
    const btn = e.currentTarget
    const id = btn.dataset.id
    btn.closest('li')?.remove()

    const entry = this.cartModelMap.get(id)
    if (entry) {
      this.removeModelCompletely(entry.model)
      this.cartModelMap.delete(id)
      this.saveCartToStorage()
      this.relayoutModels()
    }

    if (this.cartModelMap.size === 0) {
      this.listTarget.innerHTML = 'Brak dodanych produktów'
      this.checkoutTarget.classList.add('d-none')
      this.placedX = -3
    }
  }

  /* ----------- Checkout ----------- */
  checkout () {
    if (!this.cartModelMap.size) return
    const payload = btoa(encodeURIComponent(JSON.stringify(
      Array.from(this.cartModelMap.entries()).map(([id, { variantCode, productName }]) => ({
        productId: id, variantCode, productName, quantity: 1
      }))
    )))
    window.location.href = `/custom-add-to-cart?cart=${payload}`
  }

  /* ----------- Viewer ----------- */
  initViewer (container) {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000)
    camera.position.set(0, 1.5, 8)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5)
    scene.add(hemi)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.autoRotate = true
    controls.autoRotateSpeed = -0.4
    controls.target.set(0, 0.5, 0)
    controls.update()

    const pmrem = new THREE.PMREMGenerator(renderer)
    new RGBELoader().load('/media/hdr/neutral.hdr', hdr => {
      const env = pmrem.fromEquirectangular(hdr).texture
      scene.environment = env
      scene.background = env
      hdr.dispose(); pmrem.dispose()
    })

    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      scene.traverse(obj => {
        if (!obj.userData.fallSpeed) return
        const bottom = obj.position.y - 0.5
        obj.position.y = bottom <= this.groundY ? this.groundY + 0.5 : obj.position.y - obj.userData.fallSpeed
        if (bottom <= this.groundY) obj.userData.fallSpeed = 0
      })
      renderer.render(scene, camera)
    }
    animate()

    window.addEventListener('resize', () => {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    })

    return { scene, camera, renderer, controls }
  }

  /* ----------- LocalStorage ----------- */
  saveCartToStorage () {
    const seen = new Set()
    const data = []

    for (const [id, { variantCode, productName, modelPath }] of this.cartModelMap) {
      if (seen.has(id)) continue
      seen.add(id)
      data.push({ productId: id, variantCode, productName, modelPath })
    }
    localStorage.setItem('cart', JSON.stringify(data))
  }

  loadCartFromStorage () {
    const saved = JSON.parse(localStorage.getItem('cart') || '[]')
    saved.forEach(({ productId, variantCode, productName, modelPath }) => {
      if (!modelPath || this.cartModelMap.has(productId) || this.loadingModelIds.has(productId)) return

      this.loadingModelIds.add(productId)
      this.cartModelMap.set(productId, { model: null, variantCode, productName, modelPath })

      this.loadModel(modelPath, productId, model => {
        this.loadingModelIds.delete(productId)

        this.normalizeModel(model, 1)
        model.position.set(this.placedX, 5, 0)
        model.userData.fallSpeed = 0.03;
        this.cartScene.add(model)

        const existing = this.cartModelMap.get(productId)
        this.cartModelMap.set(productId, { ...existing, model })

        this.placedX += 2
        this.addProductLine(productId, productName)
        this.checkoutTarget.classList.remove('d-none')
        this.relayoutModels()
      })
    })
  }

  /* ----------- Helpers ----------- */
  loadModel (path, id, onLoad) {
    new GLTFLoader().load(path, gltf => {
      gltf.scene.userData.productId = id
      onLoad(gltf.scene)
    }, undefined, err => console.error('GLTF error', err))
  }

  normalizeModel (model, targetHeight = 1) {
    const bbox = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    bbox.getSize(size)
    model.scale.setScalar(targetHeight / size.y)
  }

  addProductLine (id, name) {
    if (this.listTarget.querySelector(`button[data-id="${id}"]`)) return

    let ul = this.listTarget.querySelector('ul')
    if (!ul) {
      ul = document.createElement('ul')
      ul.className = 'list-group list-group-flush'
      this.listTarget.innerHTML = ''
      this.listTarget.appendChild(ul)
    }

    const li = document.createElement('li')
    li.className = 'list-group-item d-flex justify-content-between align-items-center'
    li.innerHTML = `
    <span class="me-2">${name}</span>
    <button class="btn btn-sm btn-outline-danger remove-from-cart"
            data-id="${id}"
            data-action="configurator#handleRemoveClick">
      <i class="bi bi-trash"></i><span class="d-none d-sm-inline"> Usuń</span>
    </button>`
    ul.appendChild(li)
    // ul.prepend(li);
  }


  relayoutModels () {
    let x = -3
    const spacing = 2
    for (const { model } of this.cartModelMap.values()) {
      if (model) model.position.x = x
      x += spacing
    }
    this.placedX = x
    const mid = -3 + (this.cartModelMap.size - 1) * spacing / 2
    this.cartControls.target.set(mid, 0.5, 0)
    this.cartCamera.position.set(mid, 1.8, 5)
    this.cartControls.update()
  }
}
