<template>
  <article class="panel is-outlined" style="pointer-events: auto">
    <p class="panel-heading">
      Pixel
    </p>
    <p v-if="!selectedPixel" class="panel-block">Click on a pixel to select it.</p>
    <div v-else>
      <div class="panel-block">
        <div>
          <div class="field">
            <label class="label">
              Coordinates
            </label>
            <div class="control">
              <p>{{ selectedPixel[0] }}, {{ selectedPixel[1] }}</p>
            </div>
          </div>

          <div class="field">
            <label class="label">
              ID
            </label>
            <div class="control">
              <p>{{ pixelID }}</p>
            </div>
          </div>

          <div class="field">
            <label class="label">
              Owner
            </label>
            <div class="control">
              <p>{{ ownerStr }}</p>
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
        </div>

      </div>
        <div v-if="!userIsOwner" class="panel-block">
          <button
            class="button is-dark is-fullwidth"
            v-on:click="buyModalActive = true"
          >Buy</button>
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
import { pixelCoordsToID, gWeiToWei } from '../utils.js'
import BuyModal from './BuyModal.vue'

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
    }
  },

  computed: {
    pixelID() {
      return pixelCoordsToID(this.selectedPixel)
    },
    priceStr() {
      if (this.price) {
        return ethers.utils.formatEther(this.price) + " ETH"
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
      return this.owner
    },
    userIsOwner() {
        return this.account == this.owner
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