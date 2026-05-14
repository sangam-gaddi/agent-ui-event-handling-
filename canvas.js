// ============================================================
// canvas.js — Draw-to-Reveal Animation (same logic as original)
// Mouse Events: mousedown, mousemove, mouseup, mouseout
// ============================================================

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Black canvas background
ctx.fillStyle = "#000000";
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.lineJoin = "round";
ctx.lineCap  = "round";
ctx.lineWidth = 8;
ctx.strokeStyle = "#ef4444";  /* red brush */
ctx.globalCompositeOperation = "source-over";  /* draw, don't erase */

let isDrawing = false;
let lastX = 0;
let lastY = 0;

function draw(e) {
  if (!isDrawing) return;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
  [lastX, lastY] = [e.offsetX, e.offsetY];
}

// mousedown event
canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  [lastX, lastY] = [e.offsetX, e.offsetY];
});

// mousemove event
canvas.addEventListener("mousemove", draw);

// mouseup event
canvas.addEventListener("mouseup", () => (isDrawing = false));

// mouseout event
canvas.addEventListener("mouseout", () => (isDrawing = false));

// Touch support (bonus)
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  isDrawing = true;
  const r = canvas.getBoundingClientRect();
  [lastX, lastY] = [e.touches[0].clientX - r.left, e.touches[0].clientY - r.top];
});
canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (!isDrawing) return;
  const r = canvas.getBoundingClientRect();
  const x = e.touches[0].clientX - r.left;
  const y = e.touches[0].clientY - r.top;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();
  [lastX, lastY] = [x, y];
}, { passive: false });
canvas.addEventListener("touchend", () => (isDrawing = false));

// Resize handler
window.addEventListener("resize", () => {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.putImageData(imageData, 0, 0);
});
