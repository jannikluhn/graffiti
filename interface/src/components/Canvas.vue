<template>
  <canvas
    ref="canvas"
    v-on:mousedown="onMouseDown"
    v-on:mousemove="onMouseMove"
    v-on:mouseup="onMouseUp"
    v-on:wheel="onWheel"
  >
  </canvas>
</template>

<script>
import { ethers } from "ethers";
import gql from "graphql-tag";
import { idToPixelCoords, colorsRGBA } from "../utils";
import { gridSize } from "../config";
import { addV, subV, mulV, divV } from "../maths";

const pixelQuery = gql`
  {
    graffiti(id: "") {
      pixels
    }
  }
`;

const minPixelSize = 1;
const maxPixelSize = 50;
const selectedLineWidth = 4;

function mouseCanvasCoords(event) {
  const bounds = event.target.getBoundingClientRect();
  const x = event.pageX - bounds.left - scrollX;
  const y = event.pageY - bounds.top - scrollY;
  return [x, y];
}

function pixelCoordsInGrid(p) {
  return p[0] >= 0 && p[1] >= 0 && p[0] < gridSize[0] && p[1] < gridSize[1];
}

function coordsEqual(c1, c2) {
  if (!c1 && !c2) {
    return true;
  } else if (!c1 || !c2) {
    return false;
  } else {
    return c1[0] == c2[0] && c1[1] == c2[1];
  }
}

function getInitialPixelSize(canvasSize) {
  const dim = canvasSize[0] > canvasSize[1] ? 1 : 0;
  return clampPixelSize(canvasSize[dim] / (gridSize[dim] * 1.1));
}

function getInitialCanvasOffset(canvasSize, pixelSize) {
  return subV(
    divV(canvasSize, 2),
    mulV(gridSize, pixelSize / 2),
  );
}

function clampPixelSize(pixelSize) {
  return Math.min(
    Math.max(pixelSize, minPixelSize),
    maxPixelSize,
  );
}

function canvasToPixelCoords(canvasCoords, canvasOffset, pixelSize) {
  if (!canvasCoords) {
    return null
  }
  const pixelCoords = divV(subV(canvasCoords, canvasOffset), pixelSize);
  const pixelCoordsRounded = [Math.floor(pixelCoords[0]), Math.floor(pixelCoords[1])];
  if (pixelCoordsInGrid(pixelCoordsRounded)) {
    return pixelCoordsRounded;
  }
  return null;
}

function pixelToCanvasCoords(pixelCoords, canvasOffset, pixelSize) {
  if (!pixelCoords) {
    return null
  }
  return addV(mulV(pixelCoords, pixelSize), canvasOffset);
}

function clampCanvasOffset(canvasOffset, canvasSize, pixelSize) {
  let o = [canvasOffset[0], canvasOffset[1]];
  o[0] = Math.max(o[0], -(gridSize[0] - 1) * pixelSize);
  o[1] = Math.max(o[1], -(gridSize[1] - 1) * pixelSize);
  o[0] = Math.min(o[0], canvasSize[0] - pixelSize);
  o[1] = Math.min(o[1], canvasSize[1] - pixelSize);
  return o;
}

export default {
  name: "Canvas",

  data() {
    return {
      ctx: null,
      canvasSize: [0, 0],
      pixelSize: 10,
      lastCanvasOffset: [0, 0],
      selectedPixelCoords: null,

      offscreenCanvas: null,
      offscreenCtx: null,
      imageData: null,

      mouseDownCanvasCoords: null,
      mouseMoveCanvasCoords: null,
      mouseUpCanvasCoords: null,
    };
  },

  computed: {
    mouseDownPixelCoords() {
      return canvasToPixelCoords(this.mouseDownCanvasCoords, this.canvasOffset, this.pixelSize);
    },
    mouseMovePixelCoords() {
      return canvasToPixelCoords(this.mouseMoveCanvasCoords, this.canvasOffset, this.pixelSize);
    },
    mouseUpPixelCoords() {
      return canvasToPixelCoords(this.mouseUpCanvasCoords, this.canvasOffset, this.pixelSize);
    },
    dragging() {
      return !!this.mouseDownCanvasCoords;
    },
    canvasOffset() {
      if (!this.mouseDownCanvasCoords || !this.mouseMoveCanvasCoords) {
        return this.lastCanvasOffset;
      }

      let o = addV(
        this.lastCanvasOffset,
        subV(this.mouseMoveCanvasCoords, this.mouseDownCanvasCoords)
      );
      return clampCanvasOffset(o, this.canvasSize, this.pixelSize);
    },
    selectedPixelCanvasCoords() {
      return pixelToCanvasCoords(this.selectedPixelCoords, this.canvasOffset, this.pixelSize);
    },
  },

  created() {
    window.addEventListener("resize", this.onResize);
  },
  mounted() {
    this.ctx = this.$refs.canvas.getContext("2d");
    this.resizeCanvas();

    this.pixelSize = getInitialPixelSize(this.canvasSize);
    this.lastCanvasOffset = getInitialCanvasOffset(this.canvasSize, this.pixelSize);

    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCanvas.width = gridSize[0];
    this.offscreenCanvas.height = gridSize[1];
    this.offscreenCtx = this.offscreenCanvas.getContext("2d");
    this.offscreenCtx.imageSmoothingEnabled = false;
    this.imageData = this.offscreenCtx.createImageData(
      gridSize[0],
      gridSize[1]
    );

    this.draw();

    this.$apolloClient.query({ query: pixelQuery }).then(result => {
      this.setPixelsFromGraph(result.data);
      this.draw();
    });

    if (this.$provider !== null) {
      this.$contract.on("ColorChanged", (id, _, color) => {
        if (this.imageData) {
          this.setPixel(id.toNumber(), color);
          this.offscreenCtx.putImageData(this.imageData, 0, 0);
          this.draw();
        }
      });
    }
  },
  destroyed() {
    window.removeEventListener("resize", this.onResize);
  },

  methods: {
    onResize() {
      this.resizeCanvas();
      this.draw();
    },

    resizeCanvas() {
      const w = this.$refs.canvas.clientWidth;
      const h = this.$refs.canvas.clientHeight;
      this.canvasSize = [w, h];
      this.$refs.canvas.width = w;
      this.$refs.canvas.height = h;
    },

    draw() {
      if (this.redrawRequested) {
        return;
      }
      this.redrawRequested = true;
      window.requestAnimationFrame(() => {
        this.redrawRequested = false;

        this.ctx.fillStyle = "#eeeeee";
        this.ctx.fillRect(0, 0, this.canvasSize[0], this.canvasSize[1]);

        this.ctx.save();
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.translate(
          this.canvasOffset[0],
          this.canvasOffset[1]
        );
        this.ctx.scale(this.pixelSize, this.pixelSize);
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        this.ctx.restore();

        this.ctx.beginPath();
        this.ctx.fillRect(0, 0, this.pixelSize, this.pixelSize);
        this.ctx.stroke();

        if (this.selectedPixelCanvasCoords) {
          const topLeft = [
            this.selectedPixelCanvasCoords[0] - selectedLineWidth / 2,
            this.selectedPixelCanvasCoords[1] - selectedLineWidth / 2,
          ];
          const size = [
            this.pixelSize + selectedLineWidth / 2,
            this.pixelSize + selectedLineWidth / 2,
          ];

          this.ctx.save();
          this.ctx.lineWidth = selectedLineWidth;
          this.ctx.beginPath();
          this.ctx.rect(topLeft[0], topLeft[1], size[0], size[1]);
          this.ctx.stroke();
          this.ctx.restore();
        }
      });
    },

    setPixelsFromGraph(data) {
      let pixelsHex = data.graffiti.pixels;
      let pixelsUint8Array = ethers.utils.arrayify(pixelsHex);
      for (let i = 0; i < pixelsUint8Array.length; i++) {
        this.setPixel(i, pixelsUint8Array[i]);
      }
      this.offscreenCtx.putImageData(this.imageData, 0, 0);
    },

    setPixel(id, colorByte) {
      const rgba = colorsRGBA[colorByte];
      const pixelCoords = idToPixelCoords(id, gridSize[0]);
      const redIndex = (pixelCoords[0] + pixelCoords[1] * gridSize[1]) * 4;
      for (let i = 0; i < 4; i++) {
        this.imageData.data[redIndex + i] = rgba[i];
      }
    },

    zoom(factor, center) {
      const diff = subV(this.lastCanvasOffset, center);
      const pixelSizeBefore = this.pixelSize;
      this.pixelSize = this.pixelSize * factor;
      this.pixelSize = Math.max(this.pixelSize, minPixelSize);
      this.pixelSize = Math.min(this.pixelSize, maxPixelSize);

      const realFactor = this.pixelSize / pixelSizeBefore;
      const diffScaled = mulV(diff, realFactor);
      this.lastCanvasOffset = addV(center, diffScaled);

      this.draw();
    },

    onMouseDown(event) {
      if (event.button == 0) {
        this.mouseDownCanvasCoords = mouseCanvasCoords(event);
      }
    },
    onMouseMove(event) {
      const oldPixel = this.mouseMovePixelCoords;
      this.mouseMoveCanvasCoords = mouseCanvasCoords(event);
      const newPixel = this.mouseMovePixelCoords;

      if (!this.dragging) {
        if (!coordsEqual(oldPixel, newPixel)) {
          this.$emit("cursorPixelChanged", newPixel);
        }
      } else {
        this.draw();
      }
    },
    onMouseUp(event) {
      if (!this.mouseDownCanvasCoords) {
        return;
      }

      this.mouseUpCanvasCoords = mouseCanvasCoords(event);
      if (coordsEqual(this.mouseUpCanvasCoords, this.mouseDownCanvasCoords)) {
        if (coordsEqual(this.mouseUpPixelCoords, this.selectedPixelCoords)) {
          this.selectedPixelCoords = null;
        } else {
          this.selectedPixelCoords = this.mouseUpPixelCoords;
        }
        this.$emit("pixelSelected", this.selectedPixelCoords);
        this.draw();
      }

      this.lastCanvasOffset = this.canvasOffset;
      this.mouseDownCanvasCoords = null;
    },

    onWheel(event) {
      if (!this.mouseDownCanvasCoords) {
        this.zoom(1 - event.deltaY / 10, mouseCanvasCoords(event));
      }
    },
  },
};
</script>

<style lang="scss" scoped>
canvas {
  width: 100%;
  height: 100%;
}
</style>