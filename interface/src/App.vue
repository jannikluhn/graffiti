<template>
  <div id="app">
    <Canvas v-on:pixelSelected="onPixelSelected" />
    <Panels v-bind:selectedPixel="selectedPixel" />
  </div>
</template>

<script>
import Canvas from './components/Canvas.vue'
import Panels from './components/Panels.vue'

export default {
  name: 'App',
  components: {
    Canvas,
    Panels,
  },

  data() {
    return {
      selectedPixel: null,
    }
  },

  methods: {
    onPixelSelected(coords) {
      this.selectedPixel = coords
    },
  },
}
</script>