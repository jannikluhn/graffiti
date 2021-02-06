<template>
  <canvas ref="canvas" v-on:click="onClick">
  </canvas>
</template>

<script>
export default {
  name: "Canvas",

  data() {
    return {
      ctx: null,
      canvasSize: [0, 0],
      pixelSize: 20,
      canvasOffset: [0, 0],
      selectedPixel: null,
      pixels: [
        [[0, 0], [1, 0, 1]],
        [[10, 0], [0, 0, 1]],
        [[20, 10], [0, 0, 1]],
      ],
    }
  },

  created() {
    window.addEventListener('resize', this.onResize)
  },
  mounted() {
    this.ctx = this.$refs.canvas.getContext('2d')
    this.resizeCanvas()
    this.draw()
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
      if (this.selectedPixel === null || this.selectedPixel[0] != pixelCoords[0] || this.selectedPixel[1] != pixelCoords[1]) {
        this.selectedPixel = pixelCoords
      } else {
        this.selectedPixel = null
      }
      this.$emit('pixelSelected', this.selectedPixel)
    },

    onMouseMove() {
      console.log("move")
    },

    canvasToPixelCoords(c) {
      return [
        Math.floor((c[0] - this.canvasOffset[0]) / this.pixelSize + 0.5),
        Math.floor((c[1] - this.canvasOffset[1]) / this.pixelSize + 0.5),
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
      this.ctx.fillStyle = "rgb(255,255,255)"
      this.ctx.fillRect(0, 0, this.canvasSize[0], this.canvasSize[1])

      for (const pixel of this.pixels) {
          const pixelCoords = pixel[0];
          const canvasCoords = this.pixelToCanvasCoords(pixelCoords);

          this.ctx.fillStyle = "rgb(255,0,0)"
          this.ctx.fillRect(
            canvasCoords[0] - this.pixelSize / 2,
            canvasCoords[1] - this.pixelSize / 2,
            this.pixelSize,
            this.pixelSize,
        )
      }
    },
  },
}
</script>