import { Controller } from '@hotwired/stimulus'
import * as THREE      from 'three'
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RGBELoader }  from 'three/examples/jsm/loaders/RGBELoader.js'

export default class extends Controller {
  static targets = ['viewer', 'list', 'checkout']
  static cartModelMap = new Map()

  connect () {
    if (!this.hasViewerTarget || !this.hasListTarget || !this.hasCheckoutTarget) return
    if (this._connected) return
    this._connected = true

    this.cartModelMap     = this.constructor.cartModelMap
    this.placedX          = this.cartModelMap.size ? -3 + 2 * this.cartModelMap.size : -3
    this.groundY          = -1.2
    this.loadingModelIds  = new Set()

    const { scene, camera, renderer, controls } = this.initViewer(this.viewerTarget)
    this.cartScene    = scene
    this.cartCamera   = camera
    this.cartRenderer = renderer
    this.cartControls = controls

    this.startAnimation()
    this.loadCartFromStorage()

    this.element.addEventListener('click', e => {
      const addBtn = e.target.closest('.add-to-stack')
      if (addBtn) this.handleAddClick({ currentTarget: addBtn })

      const rmBtn = e.target.closest('.remove-from-cart')
      if (rmBtn)  this.handleRemoveClick({ currentTarget: rmBtn })
    })

    this.element.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el =>
      new bootstrap.Tooltip(el)
    )
  }

  disconnect () {
    if (!this.cartRenderer) return

    cancelAnimationFrame(this._rafId)
    this.cartRenderer.forceContextLoss?.()
    this.cartRenderer.dispose?.()
    this.viewerTarget.innerHTML = ''
    delete this.cartRenderer

    window.removeEventListener('resize', this._resizeHandler)
  }

  initViewer (container) {
    const scene   = new THREE.Scene()
    const camera  = new THREE.PerspectiveCamera(
      75, container.clientWidth / container.clientHeight, 0.1, 1000)
    camera.position.set(0, 1.5, 8)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5)
    scene.add(hemi)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping   = true
    controls.autoRotate      = true
    controls.autoRotateSpeed = -0.4
    controls.target.set(0, 0.5, 0)
    controls.update()

    const pmrem = new THREE.PMREMGenerator(renderer)
    new RGBELoader().load('/media/hdr/neutral.hdr', hdr => {
      const env = pmrem.fromEquirectangular(hdr).texture
      scene.environment = env
      scene.background  = env
      hdr.dispose(); pmrem.dispose()
    })

    this._resizeHandler = () => {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', this._resizeHandler)

    return { scene, camera, renderer, controls }
  }

  startAnimation () {
    const animate = () => {
      this._rafId = requestAnimationFrame(animate)

      this.cartControls.update()

      this.cartScene.traverse(obj => {
        if (!obj.userData.fallSpeed) return
        const bottom = obj.position.y - 0.5
        obj.position.y = bottom <= this.groundY
          ? this.groundY + 0.5
          : obj.position.y - obj.userData.fallSpeed
        if (bottom <= this.groundY) obj.userData.fallSpeed = 0
      })

      this.cartRenderer.render(this.cartScene, this.cartCamera)
    }
    animate()
  }

  handleAddClick (e) {
    const btn = e.currentTarget
    const a   = btn.closest('li')?.querySelector('a')
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

  handleRemoveClick (e) {
    const btn = e.currentTarget
    const id  = btn.dataset.id
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

  removeModelCompletely (model) {
    if (!model) return
    model.traverse(o => {
      o.geometry?.dispose?.()
      if (Array.isArray(o.material)) o.material.forEach(m => m.dispose())
      else o.material?.dispose?.()
    })
    this.cartScene.remove(model)
  }

  checkout () {
    if (!this.cartModelMap.size) return
    const payload = btoa(encodeURIComponent(JSON.stringify(
      Array.from(this.cartModelMap.entries()).map(([id, { variantCode, productName }]) => ({
        productId: id, variantCode, productName, quantity: 1
      }))
    )))
    window.location.href = `/custom-add-to-cart?cart=${payload}`
  }

  saveCartToStorage () {
    const data = Array.from(this.cartModelMap.entries()).map(([id, v]) => ({
      productId: id,
      variantCode: v.variantCode,
      productName: v.productName,
      modelPath: v.modelPath
    }))
    localStorage.setItem('cart', JSON.stringify(data))
  }

  loadCartFromStorage () {
    const saved = JSON.parse(localStorage.getItem('cart') || '[]')
    saved.forEach(({ productId, variantCode, productName, modelPath }) => {
      if (!modelPath || this.cartModelMap.has(productId)) return
      this.loadingModelIds.add(productId)
      this.cartModelMap.set(productId, { model: null, variantCode, productName, modelPath })

      this.loadModel(modelPath, productId, model => {
        this.loadingModelIds.delete(productId)
        this.normalizeModel(model, 1)
        model.position.set(this.placedX, 5, 0)
        model.userData.fallSpeed = 0.03
        this.cartScene.add(model)

        const ex = this.cartModelMap.get(productId)
        this.cartModelMap.set(productId, { ...ex, model })

        this.placedX += 2
        this.addProductLine(productId, productName)
        this.checkoutTarget.classList.remove('d-none')
        this.relayoutModels()
      })
    })
  }

  static modelCache     = new Map()
  static inFlightLoads  = new Map()

  loadModel (url, id, onLoad) {
    if (this.constructor.modelCache.has(url)) {
      onLoad(this.constructor.modelCache.get(url).clone())
      return
    }

    if (this.constructor.inFlightLoads.has(url)) {
      this.constructor.inFlightLoads.get(url).then(scene =>
        onLoad(scene.clone())
      )
      return
    }

    const p = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        url,
        gltf => {
          this.constructor.modelCache.set(url, gltf.scene)
          resolve(gltf.scene)
        },
        undefined,
        err => reject(err)
      )
    })

    this.constructor.inFlightLoads.set(url, p)

    p.then(scene => {
      this.constructor.inFlightLoads.delete(url)
      onLoad(scene.clone())
    }).catch(err => {
      this.constructor.inFlightLoads.delete(url)
      console.error('GLB load error', err)
    })
  }


  normalizeModel (model, targetH = 1) {
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
    model.scale.setScalar(targetH / size.y)
  }

  addProductLine (id, name) {
    if (this.listTarget.querySelector(`button[data-id="${id}"]`)) return

    let ul = this.listTarget.querySelector('ul')
    if (!ul) {
      ul = document.createElement('ul')
      ul.className = 'list-group list-group-flush'
      this.listTarget.textContent = ''
      this.listTarget.appendChild(ul)
    }

    const li = document.createElement('li')
    li.className = 'list-group-item d-flex justify-content-between align-items-center'
    li.innerHTML = `
    <span class="me-2">${name}</span>
    <button class="btn btn-sm btn-outline-danger remove-from-cart"
            data-id="${id}"
            >
      <i class="bi bi-trash"></i><span class="d-none d-sm-inline"> Usuń</span>
    </button>`
    ul.appendChild(li)
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
