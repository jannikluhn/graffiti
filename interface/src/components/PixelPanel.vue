<template>
  <article class="panel is-outlined" style="pointer-events: auto">
    <div class="panel-heading">
      Pixel
      <button class="delete is-pulled-right" v-on:click="folded = !folded"></button>
    </div>
    <div v-if="!folded">
      <p v-if="!selectedPixel" class="panel-block">Click on a pixel to select it.</p>
      <div v-else>
        <div class="panel-block">
          <table class="table is-fullwidth">
            <tbody>
              <tr>
                <th>Coordinates</th>
                <td>{{ selectedPixel[0] }}, {{ selectedPixel[1] }}</td>
              </tr>

              <tr>
                <th>Pixel ID</th>
                <td>{{ pixelID }}</td>
              </tr>

              <tr>
                <th>Graffitier</th>
                <td>{{ ownerStr }}</td>
              </tr>

              <tr>
                <th>Price</th>
                <td>{{ priceStr }}</td>
              </tr>
            </tbody>
          </table>
        </div>
          <div v-if="!userIsOwner" class="panel-block">
            <button
              class="button is-dark is-fullwidth"
              v-on:click="buyModalActive = true"
            >Buy</button>
          </div>
      </div>
    </div>
  <BuyModal
    v-if="buyModalActive"
    v-bind:active="buyModalActive"
    v-bind:pixelID="pixelID"
    v-bind:price="price"
    v-on:close="buyModalActive = false"
    v-on:error="(msg) => $emit('error', msg)"
  />
  </article>

</template>

<script>
import { ethers } from 'ethers'
import { pixelCoordsToID, gWeiToWei, shortenAddress } from '../utils.js'
import BuyModal from './BuyModal.vue'
import { gridSize } from '../config.js'

export default {
  name: "PixelPanel",
  props: [
    "selectedPixel",
    "account",
  ],
  components: {
    BuyModal,
  },

  data() {
    return {
      owner: null,
      price: null,
      exists: null,
      buyModalActive: false,
      folded: false,
    }
  },

  computed: {
    pixelID() {
      return pixelCoordsToID(this.selectedPixel, gridSize[0])
    },
    priceStr() {
      if (this.price) {
        return ethers.utils.formatEther(this.price) + " DAI"
      } else {
        return "Unknown"
      }
    },
    ownerStr() {
      if (this.exists === null) {
        return "Unknown"
      }
      if (!this.exists) {
        return "None"
      }
      if (this.owner === null) {
        return "Unknown"
      }
      if (this.owner == this.account) {
        return "You"
      }
      return shortenAddress(this.owner)
    },
    userIsOwner() {
        return this.owner !== null && this.account == this.owner
    },
  },

  watch: {
    async selectedPixel() {
      if (this.selectedPixel) {
        try {
          let priceGWei = await this.$contract.getPrice(this.pixelID)
          this.price = gWeiToWei(priceGWei)
          this.exists = await this.$contract.exists(this.pixelID)
          if (this.exists) {
            this.owner = await this.$contract.ownerOf(this.pixelID)
          } else {
            this.owner = null
          }
        } catch(err) {
          this.exists = null
          this.price = null
          this.owner = null
          this.$emit('error', 'Failed to query pixel details: ' + err.message)
        }
      } else {
        this.exists = null
        this.price = null
        this.owner = null
      }
    },
  }
}
</script>