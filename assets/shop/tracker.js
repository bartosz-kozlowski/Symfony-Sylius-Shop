const isProductPage = window.location.pathname.includes('/products/');

if (isProductPage) {
  fetch('/click-tracker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      x: 0,
      y: 0,
      path: window.location.pathname,
      timestamp: Date.now(),
      element: 'PAGELOAD'
    })
  });
}
