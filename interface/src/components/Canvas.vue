<template>
  <canvas ref="canvas" v-on:click="onClick">
  </canvas>
</template>

<script>
import { ethers } from 'ethers'
import gql from 'graphql-tag'
import { idToPixelCoords, byteToColor } from '../utils'
import { gridSize } from '../config'

const pixelQuery = gql`
  {
    graffiti(id: "") {
      pixels
    }
  }
`

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
    }
  },

  created() {
    window.addEventListener('resize', this.onResize)
  },
  mounted() {
    this.ctx = this.$refs.canvas.getContext('2d')
    this.resizeCanvas()

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
  },
  destroyed() {
    window.removeEventListener('resize', this.onResize)
  },

  methods: {
    onResize() {
      this.resizeCanvas()
      this.draw()
    },

    onClick(e) {
      let rect = e.target.getBoundingClientRect()
      let x = e.clientX - rect.left
      let y = e.clientY - rect.top
      let pixelCoords = this.canvasToPixelCoords([x, y])
      if (pixelCoords[0] < 0 || pixelCoords[1] < 0 || pixelCoords[0] >= gridSize[0] || pixelCoords[1] >= gridSize[1]) {
        this.selectedPixel = null
      } else if (this.selectedPixel === null || this.selectedPixel[0] != pixelCoords[0] || this.selectedPixel[1] != pixelCoords[1]) {
        this.selectedPixel = pixelCoords
      } else {
        this.selectedPixel = null
      }
      this.$emit('pixelSelected', this.selectedPixel)
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
      this.canvasOffset = [this.canvasSize[0] / 2, this.canvasSize[1] / 2]
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
      })
    },

    setPixelsFromGraph(data) {
      let pixelsHex = data.graffiti.pixels
      let pixelsUint8Array = ethers.utils.arrayify(pixelsHex)
      for (let i = 0; i < pixelsUint8Array.length; i++) {
        const color = byteToColor(pixelsUint8Array[i]);
        const pixelCoords = idToPixelCoords(i, gridSize[0]);
        const redIndex = (pixelCoords[0] + pixelCoords[1] * gridSize[1]) * 4
        for (let i = 0; i < 4; i++) {
          this.imageData.data[redIndex + i] = color[i]
        }
      }
      this.offscreenCtx.putImageData(this.imageData, 0, 0)
    },
  },
}
</script>