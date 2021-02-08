<template>
  <article class="panel is-outlined" style="pointer-events: auto">
    <p class="panel-heading">
      Your Pixels
    </p>
    <div class="panel-block">
      <div class="select is-multiple">
        <select multiple size="4" v-on:change="onChange">
          <option
            v-for="pixel in pixels"
            v-bind:key="pixel.id"
            v-bind:value="pixel.id"
          >
            {{pixel.id}}
          </option>
        </select>
      </div>
    </div>
    <div class="panel-block" v-if="selectedPixel">
      <div class="form">
        <div class="field">
          <label class="label">
            Coordinates
          </label>
          <div class="control">
            <p>{{ coords[0] }}, {{ coords[1] }}</p>
          </div>
        </div>

        <div class="field">
          <label class="label">
            Price
          </label>
          <div class="control">
            <p>{{ priceStr }}</p>
          </div>
        </div>

        <div class="field">
          <label class="label">
            Color
          </label>
          <div class="control">
            <p>{{ selectedPixel.color }}</p>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>

<script>
import { ethers } from 'ethers'
import gql from 'graphql-tag'
import { gWeiToWei, idToPixelCoords } from '../utils'
import { gridSize } from '../config'

const pixelQuery = gql`
  query pixelsOf($address: Bytes, $lastID: String) {
    pixels(first:100, where:{ owner:$address, id_gt: $lastID }) {
      id
      price
      color
    }
  }
`

export default {
  name: "OwnedPixelPanel",
  props: [
    "account",
  ],
  data() {
    return {
      pixels: [],
      selectedPixel: null,
    }
  },

  watch: {
    account: {
      handler: function(newAddress, oldAddress) {
        if (newAddress == oldAddress) {
          return
        }
        if (newAddress === null) {
          this.pixels = []
          this.selectedPixel = null
          return
        }
        this.queryPixels()
      },
      immediate: true,
    },
  },

  computed: {
    price() {
      if (!this.selectedPixel) {
        return null
      }
      return gWeiToWei(ethers.BigNumber.from(this.selectedPixel.price))
    },
    priceStr() {
      if (!this.selectedPixel) {
        return ""
      }
      return ethers.utils.formatEther(this.price) + " DAI"
    },
    coords() {
      if (!this.selectedPixel) {
        return [-1, -1]
      }
      const idBig = ethers.BigNumber.from(this.selectedPixel.id)
      return idToPixelCoords(idBig, gridSize[0])
    }
  },

  methods: {
    async queryPixels() {
      this.pixels = []
      this.selectedPixel = null
      let lastID = ""
      for (;;) {
        try {
          let queryResult = await this.$apolloClient.query({
            query: pixelQuery,
            variables: {
              address: this.account,
              lastID: lastID,
            }
          })
          let pixels = queryResult.data.pixels
          if (pixels.length == 0) {
            return
          }
          this.pixels.push(...pixels)
          lastID = pixels[pixels.length - 1].id
        } catch (error) {
          this.pixels = []
          this.$emit('error', 'Failed to query pixel list: ' + error.message)
          return
        }
      }
    },

    onChange(event) {
      const id = event.target.value
      for (let pixel of this.pixels) {
        if (pixel.id == id) {
          this.selectedPixel = pixel
          return
        }
      }
    }
  },
}
</script>