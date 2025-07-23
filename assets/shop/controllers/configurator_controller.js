import { Controller } from '@hotwired/stimulus'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

function hexToLinear (hex) {
  const col = new THREE.Color(hex)
  col.convertSRGBToLinear()
  return [col.r, col.g, col.b, 1]
}

export default class extends Controller {
  static targets = ['viewer', 'list', 'checkout']
  static cartModelMap = new Map()

  connect () {
    if (!this.hasViewerTarget || !this.hasListTarget || !this.hasCheckoutTarget) return
    if (this._connected) return
    this._connected = true
    this.selectedModel = null

    this.cartModelMap = this.constructor.cartModelMap
    this.placedX = this.cartModelMap.size ? -3 + 2 * this.cartModelMap.size : -3
    this.groundY = -1.2
    this.loadingModelIds = new Set()

    const { scene, camera, renderer, controls } = this.initViewer(this.viewerTarget)
    this.cartScene = scene
    this.cartCamera = camera
    this.cartRenderer = renderer
    this.cartControls = controls

    this.startAnimation()
    this.loadCartFromStorage()

    this.element.addEventListener('click', e => {
      const addBtn = e.target.closest('.add-to-stack')
      if (addBtn) this.handleAddClick({ currentTarget: addBtn })
      const rmBtn = e.target.closest('.remove-from-cart')
      if (rmBtn) this.handleRemoveClick({ currentTarget: rmBtn })
    })

    this.element.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el =>
      new bootstrap.Tooltip(el)
    )
  }
  highlightModel(model) {
    if (this.outlineMesh) {
      this.cartScene.remove(this.outlineMesh)
      this.outlineMesh.traverse(o => {
        if (o.material) o.material.dispose()
        if (o.geometry) o.geometry.dispose()
      })
      this.outlineMesh = null
    }

    const outline = model.clone(true)

    outline.traverse(obj => {
      if (obj.isMesh) {
        obj.material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.BackSide,
          transparent: true,
          opacity: 0.6
        })
      }
    })

    outline.scale.multiplyScalar(1.05)
    this.cartScene.add(outline)
    this.outlineMesh = outline
  }


  initViewer (container) {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000)
    camera.position.set(0, 1.5, 8)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.innerHTML = ''
    container.appendChild(renderer.domElement)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.5))
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.autoRotate = true
    controls.autoRotateSpeed = -0.2
    controls.target.set(0, 0.5, 0)
    controls.update()
    const pmrem = new THREE.PMREMGenerator(renderer)
    new RGBELoader().load('/media/hdr/neutral.hdr', hdr => {
      const env = pmrem.fromEquirectangular(hdr).texture
      scene.environment = env
      scene.background = env
      hdr.dispose()
      pmrem.dispose()
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
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const animate = () => {
      this._rafId = requestAnimationFrame(animate)
      this.cartControls.update()
      this.cartScene.traverse(obj => {
        if (!obj.userData.fallSpeed) return
        const bottom = obj.position.y - 0.5
        obj.position.y = bottom <= this.groundY ? this.groundY + 0.5 : obj.position.y - obj.userData.fallSpeed
        if (bottom <= this.groundY) obj.userData.fallSpeed = 0
      })
      this.cartRenderer.render(this.cartScene, this.cartCamera)
    }
    animate()
    this.cartRenderer.domElement.addEventListener('click', event => {
      const rect = this.cartRenderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, this.cartCamera)
      const hits = raycaster.intersectObjects(this.cartScene.children, true)
      if (!hits.length) {
        if (this.outlineMesh) {
          this.cartScene.remove(this.outlineMesh)
          this.outlineMesh = null
        }
        return
      }      let obj = hits[0].object
      while (obj && !obj.userData.productId) obj = obj.parent
      if (obj?.userData.productId) {
        const entry = this.cartModelMap.get(obj.userData.productId)
        if (entry?.model) this.highlightModel(entry.model)
        this.openVariantModal(obj.userData.productId)
      }
    })
  }

  openVariantModal (productId) {
    const modalEl = document.getElementById('variantSelectModal')
    const modal = new bootstrap.Modal(modalEl)
    let variantsRaw = null
    const productLink = this.element.querySelector(`a[data-product-id="${productId}"]`)
    if (productLink) variantsRaw = productLink.dataset.variants
    if (!variantsRaw) {
      const entry = this.cartModelMap.get(productId)
      variantsRaw = entry?.variantsRaw || null
    }
    if (!variantsRaw) return
    const variants = JSON.parse(variantsRaw)
    const form = document.getElementById('variantForm')
    const confirmBtn = document.getElementById('confirmVariantBtn')
    if (!Array.isArray(variants) || variants.length <= 1) {
      form.innerHTML = '<p class="text-center mb-0">Brak innych wariantów</p>'
      confirmBtn.classList.add('d-none')
      modal.show()
      return
    }
    confirmBtn.classList.remove('d-none')
    const entry = this.cartModelMap.get(productId)
    const defaultVariant = variants.find(v => v.code === entry?.variantCode) || variants[0]
    form.innerHTML = variants.map(variant => {
      const opts = variant.options.map(o => `<strong>${o.name}</strong>: ${o.value}`).join(', ')
      const color = variant.color
        ? `<span class="ms-2"><strong>Kolor:</strong></span><span title="${variant.color}" style="display:inline-block;width:16px;height:16px;background:${variant.color};border:1px solid #ccc;margin-left:4px;vertical-align:middle;"></span>`
        : ''
      return `<div class="form-check mb-2">
        <input class="form-check-input" type="radio" name="variant" id="variant-${variant.id}" value="${variant.code}" data-color="${variant.color || ''}" ${variant.code === defaultVariant.code ? 'checked' : ''}>
        <label class="form-check-label" for="variant-${variant.id}">${opts}${color}</label>
      </div>`
    }).join('')
    confirmBtn.onclick = () => {
      const chosen = form.querySelector('input[name="variant"]:checked')
      if (!chosen) return
      const code = chosen.value
      const color = chosen.dataset.color || null
      const entry = this.cartModelMap.get(productId)
      if (entry) {
        entry.variantCode = code
        entry.color = color
        if (color && entry.model) this.applyColorToModel(entry.model, color)
        this.cartModelMap.set(productId, entry)
        this.saveCartToStorage()
      }
      modal.hide()
    }
    modal.show()
  }

  markTintableMaterials (model) {
    model.traverse(obj => {
      if (!obj.isMesh) return
      for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
        if (!mat) continue
        const textured = mat.map || mat.emissiveMap || mat.roughnessMap || mat.metalnessMap || mat.normalMap || mat.specularMap || mat.alphaMap || mat.lightMap || mat.pbrMetallicRoughness?.baseColorTexture
        if (!textured) mat.userData.tintable = true
      }
    })
  }
  applyColorToModel(model, colorHex) {
    if (!colorHex) return

    model.traverse(obj => {
      if (!obj.isMesh) return

      const materials = Array.isArray(obj.material) ? obj.material : [obj.material]

      materials.forEach(mat => {
        if (!mat || !mat.color) return

        mat.color.set(colorHex)
        mat.needsUpdate = true
      })
    })
  }


  handleAddClick (e) {
    const btn = e.currentTarget
    const a = btn.closest('li')?.querySelector('a')
    if (!a) return
    const { model: modelPath, productId, productName, variantId: variantCode, color, variants: variantsRaw } = a.dataset
    if (!modelPath || this.cartModelMap.has(productId) || this.loadingModelIds.has(productId)) return
    this.loadingModelIds.add(productId)
    this.cartModelMap.set(productId, { model: null, variantCode, productName, modelPath, color, variantsRaw })
    this.loadModel(modelPath, productId, model => {
      this.loadingModelIds.delete(productId)
      this.markTintableMaterials(model)
      this.normalizeModel(model, 1)
      this.applyColorToModel(model, color)
      model.position.set(this.placedX, 5, 0)
      model.userData.fallSpeed = 0.03
      model.userData.productId = productId
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
    const id = btn.dataset.id
    btn.closest('li')?.remove()
    const entry = this.cartModelMap.get(id)
    if (entry) {
      if (this.outlineMesh && this.outlineMesh.userData?.productId === id) {
        this.cartScene.remove(this.outlineMesh)
        this.outlineMesh = null
      }
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

  saveCartToStorage () {
    const data = Array.from(this.cartModelMap.entries()).map(([id, v]) => ({
      productId: id,
      variantCode: v.variantCode,
      productName: v.productName,
      modelPath: v.modelPath,
      color: v.color || null,
      variantsRaw: v.variantsRaw || null
    }))
    localStorage.setItem('cart', JSON.stringify(data))
  }

  loadCartFromStorage () {
    const saved = JSON.parse(localStorage.getItem('cart') || '[]')
    saved.forEach(({ productId, variantCode, productName, modelPath, color, variantsRaw }) => {
      if (!modelPath || this.cartModelMap.has(productId)) return
      this.loadingModelIds.add(productId)
      this.cartModelMap.set(productId, { model: null, variantCode, productName, modelPath, color, variantsRaw })
      this.loadModel(modelPath, productId, model => {
        this.loadingModelIds.delete(productId)
        this.markTintableMaterials(model)
        this.normalizeModel(model, 1)
        if (color) this.applyColorToModel(model, color)
        model.position.set(this.placedX, 5, 0)
        model.userData.fallSpeed = 0.03
        model.userData.productId = productId
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

  static modelCache = new Map()
  static inFlightLoads = new Map()

  loadModel (url, id, onLoad) {
    if (this.constructor.modelCache.has(url)) {
      onLoad(this.constructor.modelCache.get(url).clone())
      return
    }
    if (this.constructor.inFlightLoads.has(url)) {
      this.constructor.inFlightLoads.get(url).then(scene => onLoad(scene.clone()))
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

  removeModelCompletely (model) {
    if (!model) return
    model.traverse(o => {
      o.geometry?.dispose?.()
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
      mats.forEach(m => m.dispose())
    })
    this.cartScene.remove(model)
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
    li.innerHTML = `<span class="me-2">${name}</span><button class="btn btn-sm btn-outline-danger remove-from-cart" data-id="${id}"><i class="bi bi-trash"></i><span class="d-none d-sm-inline"> Usuń</span></button>`
    ul.appendChild(li)
  }

  relayoutModels () {
    let x = -3
    const spacing = 2
    for (const { model } of this.cartModelMap.values()) {
      if (model) model.position.x = x
      if (this.outlineMesh && model.userData.productId === this.outlineMesh.userData.productId) {
        this.outlineMesh.position.x = x
      }
      x += spacing
    }
    this.placedX = x
    const mid = -3 + (this.cartModelMap.size - 1) * spacing / 2
    this.cartControls.target.set(mid, 0.5, 0)
    this.cartCamera.position.set(mid, 1.8, 5)
    this.cartControls.update()
  }

  checkout () {
    if (!this.cartModelMap.size) return
    const payload = btoa(encodeURIComponent(JSON.stringify(Array.from(this.cartModelMap.entries()).map(([id, { variantCode, productName }]) => ({ productId: id, variantCode, productName, quantity: 1 })))))
    window.location.href = `/custom-add-to-cart?cart=${payload}`
  }
}
