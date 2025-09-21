function animateTextColor(element, startColor, endColor, duration) {
  const startTime = performance.now();

  function interpolateColor(color1, color2, factor) {
    const r = Math.round(color1.r + factor * (color2.r - color1.r));
    const g = Math.round(color1.g + factor * (color2.g - color1.g));
    const b = Math.round(color1.b + factor * (color2.b - color1.b));
    return `rgb(${r}, ${g}, ${b})`;
  }

  function animate() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1); // Ensure progress doesn't exceed 1

    const currentColor = interpolateColor(startColor, endColor, progress);
    element.style.color = currentColor;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}