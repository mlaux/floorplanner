// these need to be the same order as the tool-* elements in the html
const TOOL_SCROLL = 0;
const TOOL_RECTANGLE = 1;
const TOOL_LINE = 2;
const TOOL_TEXT = 3;
const TOOL_DELETE = 4;

// how far away the mouse can be for an item to be selected on click (squared)
const SELECT_DISTANCE = 25;
const GRID_WIDTH = 2;
const LINE_WIDTH = 2;
const LINE_WIDTH_SELECTED = 3;
const ZOOMS = [.5, .67, .8, .9, 1, 1.1, 1.25, 1.33, 1.5, 1.75, 2];
// needed for mouse coordinate translation when zoomed in or out
const INV_ZOOMS = [];
(function() {
  for (let k = 0; k < ZOOMS.length; k++) {
    INV_ZOOMS[k] = 1 / ZOOMS[k];
  }
})();

let currentTool = TOOL_SCROLL;
let gridSize = 32;
let zoomIndex = 4;

let theCanvas = null;
let ctx = null;

let scrollOffsetX = 0;
let scrollOffsetY = 0;
let lastX = 0;
let lastY = 0;
let dragging = false;
let snapToGrid = false;

let drawing = {
  items: [
    {
      type: TOOL_RECTANGLE,
      point1: [0, 0],
      point2: [96, 96],
      color: '#ff00ff',
    },
    {
      type: TOOL_LINE,
      point1: [48, 48],
      point2: [144, 144],
      color: '#00ff00',
    },
    {
      type: TOOL_TEXT,
      point1: [12, 112],
      point2: [82, 125],
      color: '#3366cc',
      text: 'test text',
    },
  ],
};
let itemInProgress = null;
let selectedItem = null;

function el(id) {
  return document.getElementById(id);
}

function getCurrentColor() {
  return el('control-color').value;
}

function snap(x) {
  return Math.round(x / gridSize) * gridSize;
}

function pointsDiffer(item) {
  return item.point1[0] != item.point2[0] || item.point1[1] != item.point2[1];
}

function pointInRect(pt, rect) {
  return pt[0] >= rect.point1[0] && pt[0] < rect.point2[0] 
      && pt[1] >= rect.point1[1] && pt[1] < rect.point2[1]; 
}

function distancePointPoint(p1, p2) {
  return (p2[0] - p1[0]) * (p2[0] - p1[0]) + (p2[1] - p1[1]) * (p2[1] - p1[1]);
}

// https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment
function distancePointLine(pt, line) {
  let l2 = distancePointPoint(line.point1, line.point2);
  if (l2 == 0) {
    // line is just one point, not a line
    return distancePointPoint(pt, line.point1);
  }

  let t = ((pt[0] - line.point1[0]) * (line.point2[0] - line.point1[0]) 
          + (pt[1] - line.point1[1]) * (line.point2[1] - line.point1[1])) / l2;
  
  // clamp to [0, 1]
  t = Math.max(0, Math.min(1, t));

  // find distance from given point to the point created by advancing along the line
  // to the spot perpendicular to the given point
  return distancePointPoint(pt, [line.point1[0] + t * (line.point2[0] - line.point1[0]), 
      line.point1[1] + t * (line.point2[1] - line.point1[1])]);
}

// uses the line test for each edge of the rectangle
function distancePointRect(pt, rect) {
  let topLine = {
    point1: [rect.point1[0], rect.point1[1]],
    point2: [rect.point2[0], rect.point1[1]],
  };

  let rightLine = {
    point1: [rect.point2[0], rect.point1[1]],
    point2: [rect.point2[0], rect.point2[1]],
  };

  let bottomLine = {
    point1: [rect.point1[0], rect.point2[1]],
    point2: [rect.point2[0], rect.point2[1]],
  };

  let leftLine = {
    point1: [rect.point1[0], rect.point1[1]],
    point2: [rect.point1[0], rect.point2[1]],
  };

  let top = distancePointLine(pt, topLine);
  let right = distancePointLine(pt, rightLine);
  let bottom = distancePointLine(pt, bottomLine);
  let left = distancePointLine(pt, leftLine);

  return Math.min(top, right, bottom, left);
}

function drawGrid() {
  ctx.lineWidth = GRID_WIDTH;
  ctx.strokeStyle = '#ccc';

  ctx.save();
  ctx.scale(ZOOMS[zoomIndex], ZOOMS[zoomIndex]);

  let startOffsetX = scrollOffsetX % gridSize;
  let startOffsetY = scrollOffsetY % gridSize;
  // draw more lines than necessary in case we're zoomed out -
  // this should't hurt performance too bad
  let extent = INV_ZOOMS[0];

  for (let y = startOffsetY; y < extent * theCanvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(extent * theCanvas.width, y);
    ctx.stroke();
  }
  for (let x = startOffsetX; x < extent * theCanvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, extent * theCanvas.height);
    ctx.stroke();
  }

  ctx.restore();
}

function drawItem(item) {
  if (item === selectedItem) {
    ctx.lineWidth = LINE_WIDTH_SELECTED;
    color = '#f00';
  } else {
    ctx.lineWidth = LINE_WIDTH;
    if (item.color) {
      color = item.color;
    } else {
      color = '#000';
    }
  }

  ctx.strokeStyle = color;
  ctx.fillStyle = color;

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
    case TOOL_TEXT:
      // point2 for the y position b/c it measures text from the bottom
      ctx.fillText(item.text, item.point1[0], item.point2[1]);
      break;
  }
}

function drawItems() {
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';

  ctx.save();
  ctx.scale(ZOOMS[zoomIndex], ZOOMS[zoomIndex]);
  ctx.translate(scrollOffsetX, scrollOffsetY);

  drawing.items.forEach(drawItem);
  if (itemInProgress) {
    drawItem(itemInProgress);
  }

  ctx.restore();
}

function refreshCanvas() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, theCanvas.width, theCanvas.height);

  el('current-zoom').innerText = ZOOMS[zoomIndex] + 'x';
  drawGrid();
  drawItems();
}

function getSelectedItem(x, y) {
  let foundItem = null;
  drawing.items.forEach(item => {
    let dist;
    if (item.type == TOOL_LINE) {
      dist = distancePointLine([x, y], item);
    } else if (item.type == TOOL_RECTANGLE) {
      dist = distancePointRect([x, y], item);
    }

    if (dist < SELECT_DISTANCE || (item.type == TOOL_TEXT && pointInRect([x, y], item))) {
      foundItem = item;
    }
  });

  return foundItem;
}

function scaleScrollPos(oldZoom) {
  // scale scroll position by ratio of new zoom level to old zoom level
  scrollOffsetX *= INV_ZOOMS[zoomIndex] / INV_ZOOMS[oldZoom];
  scrollOffsetY *= INV_ZOOMS[zoomIndex] / INV_ZOOMS[oldZoom];
}

function zoomOut() {
  if (zoomIndex > 0) {
    --zoomIndex;
    scaleScrollPos(zoomIndex + 1);
    refreshCanvas();
  }
}

function zoomIn() {
  if (zoomIndex < ZOOMS.length - 1) {
    ++zoomIndex;
    scaleScrollPos(zoomIndex - 1);
    refreshCanvas();
  }
}

function mouseDown(evt) {
  dragging = true;

  lastX = evt.offsetX;
  lastY = evt.offsetY;

  // 0,0 is the middle of the screen
  let translatedX = INV_ZOOMS[zoomIndex] * lastX - scrollOffsetX;
  let translatedY = INV_ZOOMS[zoomIndex] * lastY - scrollOffsetY;

  selectedItem = null;

  switch (currentTool) {
    case TOOL_SCROLL:
      selectedItem = getSelectedItem(translatedX, translatedY);
      break;
    case TOOL_RECTANGLE:
    case TOOL_LINE:
      if (snapToGrid) {
        translatedX = snap(translatedX);
        translatedY = snap(translatedY);
      }
      itemInProgress = {
        type: currentTool,
        point1: [translatedX, translatedY],
        point2: [translatedX, translatedY],
        color: getCurrentColor(),
      };
      break;
    case TOOL_TEXT:
      let text = prompt('Enter text');
      if (text) {
        text = text.trim();
        if (text.length) {
          let metrics = ctx.measureText(text);
          // only supported in chrome 77 and up, FF 74 and up
          // this is not deterministic per-PC but not worrying about that now
          let height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
          drawing.items.push({
            type: TOOL_TEXT,
            point1: [translatedX, translatedY],
            point2: [translatedX + metrics.width, translatedY + height],
            color: getCurrentColor(),
            text,
          });
        }
      }
      break;
    case TOOL_DELETE:
      let item = getSelectedItem(translatedX, translatedY);
      if (item) {
        drawing.items.splice(drawing.items.indexOf(item), 1);
      }
      break;
  }

  refreshCanvas();
}

function mouseMove(evt) {
  if (!dragging) {
    return;
  }

  let translatedX = INV_ZOOMS[zoomIndex] * evt.offsetX - scrollOffsetX;
  let translatedY = INV_ZOOMS[zoomIndex] * evt.offsetY - scrollOffsetY;

  switch (currentTool) {
    case TOOL_SCROLL:
      let dx = INV_ZOOMS[zoomIndex] * (evt.offsetX - lastX);
      let dy = INV_ZOOMS[zoomIndex] * (evt.offsetY - lastY);
      if (selectedItem) {
        // move selected item
        selectedItem.point1[0] += dx;
        selectedItem.point2[0] += dx;
        selectedItem.point1[1] += dy;
        selectedItem.point2[1] += dy;
      } else {
        // move view
        scrollOffsetX += dx;
        scrollOffsetY += dy;
      }
      break;
    case TOOL_RECTANGLE:
    case TOOL_LINE:
      if (snapToGrid) {
        translatedX = snap(translatedX);
        translatedY = snap(translatedY);
      }
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
    // only add to array if they actually moved the mouse
    if (pointsDiffer(itemInProgress)) {
      drawing.items.push(itemInProgress);
    }
    itemInProgress = null;
  } else if (selectedItem && snapToGrid) {
    let dx = selectedItem.point2[0] - selectedItem.point1[0];
    let dy = selectedItem.point2[1] - selectedItem.point1[1];
    selectedItem.point1[0] = snap(selectedItem.point1[0]);
    selectedItem.point1[1] = snap(selectedItem.point1[1]);
    selectedItem.point2[0] = selectedItem.point1[0] + dx;
    selectedItem.point2[1] = selectedItem.point1[1] + dy;
  }

  dragging = false;
  refreshCanvas();
}

function mouseWheel(evt) {
  if (evt.deltaY > 0) {
    zoomIn();
  } else {
    zoomOut();
  }
}

function init() {
  // set up canvas
  theCanvas = el('the-canvas');

  theCanvas.width = window.innerWidth;
  theCanvas.height = window.innerHeight - 32;

  scrollOffsetX = theCanvas.width / 2;
  scrollOffsetY = theCanvas.height / 2;

  theCanvas.onmousedown = mouseDown;
  theCanvas.onmousemove = mouseMove;
  theCanvas.onmouseup = mouseUp;
  theCanvas.onwheel = mouseWheel;

  ctx = theCanvas.getContext('2d');
  ctx.font = '20px sans-serif';

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
  el('control-snap').onclick = evt => {
    snapToGrid = evt.target.checked;
  };
  el('control-zoom-out').onclick = zoomOut;
  el('control-zoom-in').onclick = zoomIn;

  // default control settings
  el('tool-scroll').checked = true;
  el('control-snap').checked = false;
  el('control-color').value = '#000000';

  // draw for the first time
  refreshCanvas();
}

window.onload = init;