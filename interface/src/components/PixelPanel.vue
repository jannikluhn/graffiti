<template>
  <article class="panel is-outlined" style="pointer-events: auto">
    <div class="panel-heading">
      Create Graffiti
      <chevron-up-icon size="1.5x" class="is-pulled-right" v-if="!folded" v-on:click="folded = !folded"></chevron-up-icon>
      <chevron-down-icon size="1.5x" class="is-pulled-right" v-if="folded" v-on:click="folded = !folded"></chevron-down-icon>
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
                <td v-if="unknownOwner">Unknown</td>
                <td v-else-if="!exists">None</td>
                <td v-else-if="selfOwned">You</td>
                <td v-else><AddressLink v-bind:address="owner" /></td>
              </tr>

              <tr>
                <th>Price</th>
                <td>{{ formatDAI(price) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
          <div class="panel-block">
            <button
              class="button is-dark is-fullwidth"
              v-on:click="buyModalActive = true"
              v-bind:disabled="!account || selfOwned"
            >Buy</button>
          </div>
      </div>
    </div>
  <BuyModal
    v-if="buyModalActive"
    v-bind:selectedPixel="selectedPixel"
    v-bind:active="buyModalActive"
    v-bind:pixelID="pixelID"
    v-bind:price="price"
    v-bind:account="account"
    v-bind:balance="balance"
    v-bind:taxBase="taxBase"
    v-on:close="buyModalActive = false"
    v-on:error="(msg) => $emit('error', msg)"
  />
  </article>

</template>

<script>
import { ethers } from 'ethers'
import { pixelCoordsToID, gWeiToWei } from '../utils.js'
import BuyModal from './BuyModal.vue'
import AddressLink from './AddressLink.vue'
import { gridSize } from '../config.js'
import { ChevronUpIcon, ChevronDownIcon } from 'vue-feather-icons'

export default {
  name: "PixelPanel",
  props: [
    "selectedPixel",
    "account",
    "balance",
    "taxBase",
  ],
  components: {
    BuyModal,
    ChevronUpIcon,
    ChevronDownIcon,
    AddressLink,
  },

  data() {
    return {
      owner: null,
      price: null,
      exists: null,
      buyModalActive: false,
      folded: false,
      formatDAI(value) {
        if (!value) {
          return "Unknown"
        }
        return ethers.utils.formatEther(value) + ' xDai'
      },
    }
  },

  computed: {
    pixelID() {
      return pixelCoordsToID(this.selectedPixel, gridSize[0])
    },
    unknownOwner() {
      return this.exists === null || (this.exists && this.owner === null)
    },
    selfOwned() {
      return this.owner !== null && this.owner == this.account
    },
  },

  watch: {
    async selectedPixel(newPixel, oldPixel) {
      if (newPixel === null && oldPixel === null) {
        return
      }
      if (oldPixel !== null && newPixel !== null && newPixel[0] == oldPixel[0] && newPixel[1] == oldPixel[1]) {
        return
      }

      this.exists = null
      this.price = null
      this.owner = null

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
      }
    },
  }
}
</script>