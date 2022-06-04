// these need to be the same order as the tool-* elements in the html
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
let itemInProgress = null;

function el(id) {
  return document.getElementById(id);
}

function mouseDown(evt) {
  dragging = true;

  lastX = evt.offsetX;
  lastY = evt.offsetY;

  // 0,0 is the middle of the screen
  let translatedX = lastX - scrollOffsetX;
  let translatedY = lastY - scrollOffsetY;

  switch (currentTool) {
    case TOOL_SCROLL:
      // no action required
      break;
    case TOOL_RECTANGLE:
      itemInProgress = {
        type: TOOL_RECTANGLE,
        point1: [translatedX, translatedY],
        point2: [translatedX, translatedY],
      };
      break;
  }
}

function mouseMove(evt) {
  if (!dragging) {
    return;
  }

  let translatedX = evt.offsetX - scrollOffsetX;
  let translatedY = evt.offsetY - scrollOffsetY;

  switch (currentTool) {
    case TOOL_SCROLL:
      scrollOffsetX += evt.offsetX - lastX;
      scrollOffsetY += evt.offsetY - lastY;
      break;
    case TOOL_RECTANGLE:
      itemInProgress.point2[0] = translatedX;
      itemInProgress.point2[1] = translatedY;
      break;
  }

  lastX = evt.offsetX;
  lastY = evt.offsetY;

  refreshCanvas();
}

function mouseUp() {
  if (itemInProgress) {
    drawing.items.push(itemInProgress);
    itemInProgress = null;
  }

  dragging = false;
}

function init() {
  // set up canvas
  theCanvas = el('the-canvas');

  theCanvas.width = window.innerWidth;
  theCanvas.height = window.innerHeight - 32;

  scrollOffsetX = window.innerWidth / 2;
  scrollOffsetY = window.innerHeight / 2;

  theCanvas.onmousedown = mouseDown;
  theCanvas.onmousemove = mouseMove;
  theCanvas.onmouseup = mouseUp;

  ctx = theCanvas.getContext('2d');

  // make tool buttons change selected tool
  let tools = document.getElementsByClassName('tool');
  for (let k = 0; k < tools.length; k++) {
    tools[k].onclick = () => currentTool = k;
  }

  // load and save actions
  el('control-load').onclick = () => {
    drawing = JSON.parse(el('output').value);
    refreshCanvas();
  };

  el('control-save').onclick = () => el('output').value = JSON.stringify(drawing);

  // default control settings
  el('tool-scroll').checked = true;
  el('control-snap').checked = false;

  // draw for the first time
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

  drawing.items.forEach(drawItem);
  if (itemInProgress) {
    drawItem(itemInProgress);
  }

  ctx.restore();
}

function drawItem(item) {
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
}

window.onload = init;