const TOOL_SCROLL = 0;
const TOOL_RECTANGLE = 1;
const TOOL_LINE = 2;

let currentTool = TOOL_SCROLL;
let gridSize = 32;

let theCanvas = null;
let ctx = null;

let scrollOffsetX = 0;
let scrollOffsetY = 0;
let lastX = 0;
let lastY = 0;
let dragging = false;

let drawing = {
  items: [
    {
      type: TOOL_RECTANGLE,
      point1: [0, 0],
      point2: [100, 100],
    },
    {
      type: TOOL_LINE,
      point1: [50, 50],
      point2: [150, 150],
    },
  ],
};

function el(id) {
  return document.getElementById(id);
}

function mouseDown(evt) {
  lastX = evt.offsetX;
  lastY = evt.offsetY;
  dragging = true;
}

function mouseMove(evt) {
  if (!dragging) {
    return;
  }

  switch (currentTool) {
    case TOOL_SCROLL:
      scrollOffsetX += evt.offsetX - lastX;
      scrollOffsetY += evt.offsetY - lastY;
      break;
    case TOOL_RECTANGLE:
      break;
    
  }

  lastX = evt.offsetX;
  lastY = evt.offsetY;

  refreshCanvas();
}

function init() {
  theCanvas = document.getElementById('the-canvas');

  theCanvas.width = window.innerWidth;
  theCanvas.height = window.innerHeight - 32;

  scrollOffsetX = window.innerWidth / 2;
  scrollOffsetY = window.innerHeight / 2;

  theCanvas.onmousedown = mouseDown;
  theCanvas.onmouseup = () => dragging = false;
  theCanvas.onmousemove = mouseMove;

  ctx = theCanvas.getContext('2d');

  let tools = document.getElementsByClassName('tool');
  for (let k = 0; k < tools.length; k++) {

  }

  el('control-load').onclick = () => drawing = JSON.parse(el('output').value);
  el('control-save').onclick = () => el('output').value = JSON.stringify(drawing);

  refreshCanvas();
}

function refreshCanvas() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, theCanvas.width, theCanvas.height);

  drawGrid();
  drawItems();
}

function drawGrid() {
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ccc';

  let startOffsetX = scrollOffsetX % gridSize;
  let startOffsetY = scrollOffsetY % gridSize;

  for (let y = startOffsetY; y < theCanvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(theCanvas.width, y);
    ctx.stroke();
  }
  for (let x = startOffsetX; x < theCanvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, theCanvas.height);
    ctx.stroke();
  }
}

function drawItems() {
  ctx.strokeStyle = '#000';

  ctx.save();
  ctx.translate(scrollOffsetX, scrollOffsetY);

  drawing.items.forEach(item => {
    switch (item.type) {
      case TOOL_RECTANGLE:
        let w = item.point2[0] - item.point1[0];
        let h = item.point2[1] - item.point1[1];
        ctx.strokeRect(item.point1[0], item.point1[1], w, h);
        break;
      case TOOL_LINE: 
        ctx.beginPath();
        ctx.moveTo(item.point1[0], item.point1[1]);
        ctx.lineTo(item.point2[0], item.point2[1]);
        ctx.stroke();
        break;
    }
  });

  ctx.restore();
}

window.onload = init;