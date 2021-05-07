<template>
  <div id="app" class="container">
    <div class="sidebar-container">
      <SideBar
        v-bind:selectedPixel="selectedPixel"
        v-bind:cursorPixel="cursorPixel"
        v-bind:wrongNetwork="wrongNetwork"
      />
    </div>
    <div class="canvas-container">
      <Canvas
        v-on:pixelSelected="onPixelSelected"
        v-on:cursorPixelChanged="onCursorPixelChanged"
      />
    </div>
    <!-- TODO: errors -->
  </div>
</template>

<script>
import Canvas from "./components/Canvas.vue";
import SideBar from "./components/SideBar.vue";

export default {
  name: "App",
  components: {
    Canvas,
    SideBar,
  },

  data() {
    return {
      selectedPixel: null,
      cursorPixel: null,
      network: null,
    };
  },

  mounted() {
    if (this.$provider !== null) {
      this.$provider.getNetwork().then(network => {
        this.network = network;
      });
    }
  },

  computed: {
    wrongNetwork() {
      if (!this.network) {
        return null;
      }
      return this.network.chainId != 100; // xDai
      // return this.network.chainId != 5 // goerli
    },
  },

  methods: {
    onPixelSelected(coords) {
      this.selectedPixel = coords;
    },
    onCursorPixelChanged(coords) {
      this.cursorPixel = coords;
    },
  },
};
</script>

<style lang="scss" scoped>
@import "assets/main.scss";

.container {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.sidebar-container {
  width: $sidebar-width;
  height: 100%;
  overflow: auto;
}

.canvas-container {
  flex: 1;
  height: 100%;
}
</style>