<template>
  <div id="app">
    <Canvas v-on:pixelSelected="onPixelSelected" v-bind:wrongNetwork="wrongNetwork" />
    <Panels v-bind:selectedPixel="selectedPixel" v-bind:wrongNetwork="wrongNetwork" />
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
      network: null
    }
  },

  mounted() { 
      this.$provider.getNetwork().then((network) => {
        this.network = network
      })
  },

  computed: {
    wrongNetwork() {
      if (!this.network) {
        return null
      }
      return this.network.chainId != 5 
    }
  },

  methods: {
    onPixelSelected(coords) {
      this.selectedPixel = coords
    },
  },
}
</script>