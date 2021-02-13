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
import { ethers } from 'ethers'
import gql from 'graphql-tag'
import { idToPixelCoords, colorsRGBA } from '../utils'
import { gridSize } from '../config'

const pixelQuery = gql`
  {
    graffiti(id: "") {
      pixels
    }
  }
`

const minPixelSize = 1
const maxPixelSize = 50

function clickPos(event) {
  let rect = event.target.getBoundingClientRect()
  let x = event.clientX - rect.left
  let y = event.clientY - rect.top
  return [x, y]
}

export default {
  name: "Canvas",

  data() {
    return {
      ctx: null,
      canvasSize: [0, 0],
      pixelSize: 20,
      canvasOffset: [0, 0],
      selectedPixel: null,

      offscreenCanvas: null,
      offscreenCtx: null,
      imageData: null,

      mouseDownPos: null,
      cursorPos: [0, 0],
    }
  },

  props: ["wrongNetwork"],

  created() {
    window.addEventListener('resize', this.onResize)
  },
  mounted() {
    this.ctx = this.$refs.canvas.getContext('2d')
    this.resizeCanvas()
    this.canvasOffset = [
      -this.pixelSize * gridSize[0] / 2 + this.canvasSize[0] / 2,
      -this.pixelSize * gridSize[1] / 2 + this.canvasSize[1] / 2,
    ]

    this.offscreenCanvas = document.createElement('canvas')
    this.offscreenCanvas.width = gridSize[0]
    this.offscreenCanvas.height = gridSize[1]
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')
    this.offscreenCtx.imageSmoothingEnabled = false
    this.imageData = this.offscreenCtx.createImageData(gridSize[0], gridSize[1])

    this.draw()

    this.$apolloClient.query({query: pixelQuery}).then((result) => {
      this.setPixelsFromGraph(result.data)
      this.draw()
    })

    this.$contract.on("ColorChange", (id, _, color) => {
      if (this.imageData) {
        this.setPixel(id.toNumber(), color)
        this.offscreenCtx.putImageData(this.imageData, 0, 0)
        this.draw()
      }
    })
  },
  destroyed() {
    window.removeEventListener('resize', this.onResize)
  },

  methods: {
    onResize() {
      this.resizeCanvas()
      this.draw()
    },

    canvasToPixelCoords(c) {
      return [
        Math.floor((c[0] - this.canvasOffset[0]) / this.pixelSize),
        Math.floor((c[1] - this.canvasOffset[1]) / this.pixelSize),
      ]
    },
    pixelToCanvasCoords(c) {
      return [
        c[0] * this.pixelSize + this.canvasOffset[0],
        c[1] * this.pixelSize + this.canvasOffset[1],
      ]
    },

    resizeCanvas() {
      this.canvasSize = [window.innerWidth, window.innerHeight];
      this.$refs.canvas.width = this.canvasSize[0]
      this.$refs.canvas.height = this.canvasSize[1]
    },

    draw() {
      if (this.redrawRequested) {
        return
      }
      this.redrawRequested = true
      window.requestAnimationFrame(() => {
        this.redrawRequested = false

        this.ctx.fillStyle = '#eeeeee'
        this.ctx.fillRect(0, 0, this.canvasSize[0], this.canvasSize[1])

        this.ctx.save()
        this.ctx.imageSmoothingEnabled = false
        this.ctx.translate(this.canvasOffset[0], this.canvasOffset[1])
        this.ctx.scale(this.pixelSize, this.pixelSize)
        this.ctx.drawImage(this.offscreenCanvas, 0, 0)
        this.ctx.restore()

        if (this.selectedPixel) {
          const canvasCoords = this.pixelToCanvasCoords(this.selectedPixel)
          const d = this.pixelSize * 0.3

          this.ctx.save()
          this.ctx.lineWidth = 5
          this.ctx.beginPath()
          this.ctx.rect(
            canvasCoords[0] - d,
            canvasCoords[1] - d,
            this.pixelSize + 2 * d,
            this.pixelSize + 2 * d,
          )
          this.ctx.stroke()
          this.ctx.restore()
        }
      })
    },

    setPixelsFromGraph(data) {
      let pixelsHex = data.graffiti.pixels
      let pixelsUint8Array = ethers.utils.arrayify(pixelsHex)
      for (let i = 0; i < pixelsUint8Array.length; i++) {
        this.setPixel(i, pixelsUint8Array[i])
      }
      this.offscreenCtx.putImageData(this.imageData, 0, 0)
    },

    setPixel(id, colorByte) {
      const rgba = colorsRGBA[colorByte];
      const pixelCoords = idToPixelCoords(id, gridSize[0]);
      const redIndex = (pixelCoords[0] + pixelCoords[1] * gridSize[1]) * 4
      for (let i = 0; i < 4; i++) {
        this.imageData.data[redIndex + i] = rgba[i]
      }
    },

    zoom(factor) {
      const diff = [
        this.canvasOffset[0] - this.cursorPos[0],
        this.canvasOffset[1] - this.cursorPos[1],
      ]
      const pixelSizeBefore = this.pixelSize
      this.pixelSize = this.pixelSize * factor

      if (this.pixelSize < minPixelSize) {
        this.pixelSize = minPixelSize
      } else if (this.pixelSize > maxPixelSize) {
        this.pixelSize = maxPixelSize
      }

      const realFactor = this.pixelSize / pixelSizeBefore
      const diffScaled = [
        diff[0] * realFactor,
        diff[1] * realFactor,
      ]
      this.canvasOffset = [
        this.cursorPos[0] + diffScaled[0],
        this.cursorPos[1] + diffScaled[1],
      ]

      this.draw()
    },

    onMouseDown(event) {
      if (event.button == 0) {
        this.mouseDownPos = clickPos(event)
      }
    },
    onMouseMove(event) {
      const oldPixel = this.canvasToPixelCoords(this.cursorPos)
      this.cursorPos = clickPos(event)
      const newPixel = this.canvasToPixelCoords(this.cursorPos)
      if (newPixel[0] != oldPixel[0] || newPixel[1] != oldPixel[1]) {
        if (newPixel[0] >= 0 && newPixel[0] < gridSize[0] && newPixel[1] >= 0 && newPixel[1] < gridSize[1]) {
          this.$emit('cursorPixelChanged', newPixel)
        } else {
          this.$emit('cursorPixelChanged', null)
        }
      }

      if (this.mouseDownPos) {  // dragging
        this.canvasOffset = [
          this.canvasOffset[0] + event.movementX,
          this.canvasOffset[1] + event.movementY,
        ]
        this.draw()
      }
    },
    onMouseUp(event) {
      if (event.button != 0) {
        return
      }

      const mouseUpPos = clickPos(event)
      if (this.mouseDownPos && mouseUpPos[0] == this.mouseDownPos[0] && mouseUpPos[1] == this.mouseDownPos[1]) {
        const pixelCoords = this.canvasToPixelCoords(mouseUpPos)
        if (pixelCoords[0] < 0 || pixelCoords[1] < 0 || pixelCoords[0] >= gridSize[0] || pixelCoords[1] >= gridSize[1]) {
          this.selectedPixel = null
        } else if (this.selectedPixel === null || this.selectedPixel[0] != pixelCoords[0] || this.selectedPixel[1] != pixelCoords[1]) {
          this.selectedPixel = pixelCoords
        } else {
          this.selectedPixel = null
        }
        this.$emit('pixelSelected', this.selectedPixel)
        this.draw()
      }

      this.mouseDownPos = null
    },
    onWheel(event) {
      this.zoom(1 - event.deltaY / 10)
    },
  },
}
</script>