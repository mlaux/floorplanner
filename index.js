let theCanvas = null;
let ctx = null;
let gridSize = 32;

let scrollOffsetX = 0;
let scrollOffsetY = 0;
let lastX = 0;
let lastY = 0;
let dragging = false;

function init() {
  theCanvas = document.getElementById('the-canvas');

  theCanvas.width = window.innerWidth;
  theCanvas.height = window.innerHeight - 32;

  theCanvas.onmousedown = evt => {
    lastX = evt.offsetX;
    lastY = evt.offsetY;
    dragging = true;
  }
  theCanvas.onmouseup = () => {
    dragging = false;
  }
  theCanvas.onmousemove = evt => {
    if (!dragging) {
      return;
    }

    scrollOffsetX += evt.offsetX - lastX;
    scrollOffsetY += evt.offsetY - lastY;

    lastX = evt.offsetX;
    lastY = evt.offsetY;

    console.log(scrollOffsetX, scrollOffsetY);
    refreshCanvas();
  }

  ctx = theCanvas.getContext('2d');
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ddd';

  refreshCanvas();
}

function refreshCanvas() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, theCanvas.width, theCanvas.height);

  drawGrid();
}

function drawGrid() {
  for (let y = scrollOffsetY; y < theCanvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(theCanvas.width, y);
    ctx.stroke();
  }
  for (let x = scrollOffsetX; x < theCanvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, theCanvas.height);
    ctx.stroke();
  }
}

window.onload = init;