let theCanvas;
let ctx;
let gridSize = 32;

function init() {
  theCanvas = document.getElementById('the-canvas');

  theCanvas.width = window.innerWidth;
  theCanvas.height = window.innerHeight - 32;

  ctx = theCanvas.getContext('2d');
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#eee';

  refreshCanvas();
}

function refreshCanvas() {
  drawGrid();
}

function drawGrid() {
  for (let y = 0; y < theCanvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(theCanvas.width, y);
    ctx.stroke();
  }
  for (let x = 0; x < theCanvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, theCanvas.height);
    ctx.stroke();
  }
}

window.onload = init;