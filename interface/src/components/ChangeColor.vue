<template>
  <div class="field is-grouped is-grouped-centered">
    <div class="control is-expanded">
      <div class="columns is-centered">
        <div class="column is-narrow">
          <v-swatches 
            v-model="colorHex" 
            :swatches="swatches"
            show-border
            popover-y="top"
          ></v-swatches>
        </div>
      </div>
    </div>
    <div class="control">
      <a
        class="button is-dark"
        v-bind:class="{'is-loading': waitingForTx}"
        v-on:click="changeColor"
        v-bind:disabled="!colorChanged"
      >
        Change Color
      </a>
    </div>
  </div>
</template>

<script>
import VSwatches from 'vue-swatches'
import { colorToByte } from '../utils'

export default {
  name: "ChangeColorField",
  components: {
    VSwatches,
  },

  props: [
    "account",
    "pixelID",
    "currentColor",
  ],

  data() {
    return {
      waitingForTx: false,
      colorHex: '#ffffff',
      swatches: [
        '#ffffff',
        '#e4e4e4',
        '#888888',
        '#222222',
        '#ffa7d1',
        '#e50000',
        '#e59500',
        '#a06a42',
        '#e5d900',
        '#94e044',
        '#02be01',
        '#00d3dd',
        '#0083c7',
        '#0000ea',
        '#cf6ee4',
        '#820080',
      ],
    }
  },

  watch: {
    currentColor: {
      handler() {
        this.colorHex = this.swatches[this.currentColor]
      },
      immediate: true,
    },
  },

  computed: {
    colorChanged() {
      return colorToByte(this.colorHex) != this.currentColor
    },
  },

  methods: {
    async changeColor() {
      this.waitingForTx = true
      try {
        let signer = this.$provider.getSigner(this.account)
        let contract = this.$contract.connect(signer)
        await contract.setColor(this.pixelID, colorToByte(this.colorHex))
      } catch(err) {
        this.$emit('error', 'Failed to send change color transaction: ' + err.message)
      }
      this.waitingForTx = false
    },
  },
}
</script>