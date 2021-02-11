<template>
  <article class="panel is-outlined" style="pointer-events: auto">
    <p class="panel-heading">
      Your Pixels
      <button class="delete is-pulled-right" v-on:click="folded = !folded"></button>
    </p>
    <div v-if="!folded">
      <div v-if="!pixels.length" class="panel-block">
        <p>You don't seem to own any pixels.</p>
      </div>
      <div v-else class="panel-block">
        <div class="select is-fullwidth">
          <select v-on:change="onChange">
            <option
              v-for="pixel in pixels"
              v-bind:key="pixel.id"
              v-bind:value="pixel.id"
              v-bind:selected="selectedPixel && pixel.id == selectedPixel.id"
            >
              {{ hexToIntStr(pixel.id) }}
            </option>
          </select>
        </div>
      </div>
      <div class="panel-block" v-if="selectedPixel">
        <table class="table is-fullwidth">
          <tbody>
            <tr>
              <th>Coordinates</th>
              <td>{{ coords[0] }}, {{ coords[1] }}</td>
            </tr>

            <tr>
              <th>Price</th>
              <td>{{ priceStr }}</td>
            </tr>

            <tr>
              <th>Color</th>
              <td>
                <v-swatches
                  v-model="swatches[selectedPixel.color.toString()]"
                  :swatches="swatches"
                  show-border
                  disabled
                ></v-swatches>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="panel-block" v-if="selectedPixel">
        <form>
          <ChangeColorField
            v-bind:account="account"
            v-bind:pixelID="selectedPixel.id"
            v-bind:currentColor="selectedPixel.color"
            v-on:error="(msg) => $emit('error', msg)"
          />
          <ChangePriceField
            v-bind:account=account
            v-bind:pixelID="selectedPixel.id"
            v-on:error="(msg) => $emit('error', msg)"
          />
        </form>
      </div>
    </div>
  </article>
</template>

<script>
import { ethers } from 'ethers'
import gql from 'graphql-tag'
import { gWeiToWei, idToPixelCoords, colorsHex } from '../utils'
import { gridSize } from '../config'
import ChangePriceField from './ChangePrice.vue'
import ChangeColorField from './ChangeColor.vue'
import VSwatches from 'vue-swatches'


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
  components: {
    ChangePriceField,
    ChangeColorField,
    VSwatches,
  },
  props: [
    "account",
  ],
  data() {
    return {
      pixels: [],
      selectedPixel: null,
      folded: false,
      swatches: colorsHex,
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
            if (this.pixels.length > 0) {
              this.selectedPixel = this.pixels[0]
            }
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
    },

    hexToIntStr(n) {
      return ethers.BigNumber.from(n).toString()
    },
  },
}
</script>