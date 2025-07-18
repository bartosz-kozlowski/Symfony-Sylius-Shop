const viewer = document.getElementById('viewer');
const picker = document.getElementById('colorPicker');
const exportBtn = document.getElementById("exportBtn");
const saveBtn = document.getElementById("saveBtn");
const placeholder = document.getElementById("placeholder");
const productLinks = document.querySelectorAll('#productList a');

function hexToRGBA(hex) {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
    1
  ];
}

// Funkcja do eksportu modelu
async function exportGLB() {
  const glTF = await viewer.exportScene();
  const file = new File([glTF], "export.glb");
  const link = document.createElement("a");
  link.download = file.name;
  link.href = URL.createObjectURL(file);
  link.click();
}

window.exportGLB = exportGLB;

// Obsługa wyboru produktu
productLinks.forEach(link => {
  link.addEventListener('click', async (e) => {
    e.preventDefault();
    productLinks.forEach(a => a.classList.remove('active'));
    link.classList.add('active');

    const modelUrl = link.getAttribute('data-model');
    const code = link.getAttribute('data-code');
    if (!modelUrl || !code) return;

    viewer.removeAttribute('src');
    exportBtn.classList.add('d-none');
    saveBtn.classList.add('d-none');

    viewer.setAttribute('src', modelUrl + '?t=' + Date.now());

    viewer.addEventListener('load', () => {
      const material = viewer.model?.materials?.[0];
      if (material?.pbrMetallicRoughness) {
        const currentColor = material.pbrMetallicRoughness.baseColorFactor;
        if (currentColor) {
          picker.value = "#" + [0, 1, 2].map(i =>
            Math.round(currentColor[i] * 255).toString(16).padStart(2, '0')
          ).join('');
        }

        picker.oninput = () => {
          const rgba = hexToRGBA(picker.value);
          material.pbrMetallicRoughness.setBaseColorFactor(rgba);
        };
      }

      placeholder.style.display = 'none';
      picker.classList.remove('d-none');
      exportBtn.classList.remove('d-none');
      saveBtn.classList.remove('d-none');
    }, { once: true });
  });
});

// Zapis modelu z kolorem
saveBtn.addEventListener('click', async () => {
  const activeLink = document.querySelector('#productList a.active');
  if (!activeLink) {
    alert("Nie wybrano produktu!");
    return;
  }

  const code = activeLink.getAttribute('data-code');
  const modelUrl = activeLink.getAttribute('data-model');
  console.log(modelUrl);

  try {
    const glbBlob = await viewer.exportScene();
    const formData = new FormData();
    formData.append('model', new File([glbBlob], `${code}.glb`, { type: 'model/gltf-binary' }));

    const resUpload = await fetch(`/admin/3d-canvas/upload-model/${code}`, {
      method: 'POST',
      body: formData
    });

    if (!resUpload.ok) throw new Error("Błąd przesyłania modelu");
    
    viewer.setAttribute('src', modelUrl + '?t=' + Date.now());

    alert("Zapisano i zaktualizowano model 3D.");
  } catch (err) {
    console.error(err);
    alert("Wystąpił błąd podczas zapisu.");
  }
});
