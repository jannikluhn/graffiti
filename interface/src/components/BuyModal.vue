<template>
  <div class="modal" v-bind:class="{'is-active': active}">
    <div class="modal-background"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Buy Pixel</p>
          <button class="delete" aria-label="close" v-on:click="close()"></button>
        </header>

        <section class="modal-card-body">
          <form>
            <div class="field">
              <label class="label">
                Pixel ID
              </label>
              <div class="control">
                <p>{{ pixelID }}</p>
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
                New Price
              </label>
              <div class="control">
                <input class="input" type="text" placeholder="DAI" v-model="newPriceInput">
                <p v-if="newPriceInput && newPriceInvalid" class="help is-danger">Invalid price</p>
                <p>
                (You must pay 1% per month on this price.)
                </p>
              </div>
            </div>

            <div class="field">
              <div class="form__label">
                <strong>Please choose a color:</strong>
                <v-swatches 
                  v-model="colorSwatch" 
                  :swatches="swatches"
                  row-length="4"
                  show-labels: false
              
                  popover-x="left"
                ></v-swatches>
              </div>
            </div>
          </form>
        </section>

        <footer class="modal-card-foot">
          <button
            class="button is-dark"
            v-bind:class="{'is-loading': waitingForTx}"
            v-bind:disabled="newPriceInvalid || colorInputInvalid"
            v-on:click="buy()"
          >Buy</button>
          <button class="button" v-on:click="close()">Cancel</button>
        </footer>
    </div>
  </div>
</template>

<script>
import { ethers } from 'ethers'
import { weiToGWei, weiToEth, colorToByte } from '../utils.js'
import VSwatches from 'vue-swatches'

export default {
  name: "BuyModal",
  components: { VSwatches },
  props: [
    "active",
    "price",
    "pixelID",
    "account",
  ],
  data() {
    return {
      newPriceInput: weiToEth(this.price).toString(),
      waitingForTx: false,
      colorSwatch: null,
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
  computed: {
    priceStr() {
      if (this.price) {
        return ethers.utils.formatEther(this.price) + " DAI"
      } else {
        return "Unknown"
      }
    },
    newPrice() {
      try {
        return ethers.utils.parseEther(this.newPriceInput)
      } catch(err) {
        return null
      }
    },
    newPriceInvalid() {
      return this.newPrice === null || this.newPrice < 0
    },
    color() {
      let n = Number(colorToByte(this.colorSwatch))
      if (isNaN(n) || !Number.isInteger(n) || n < 0 || n > 255) {
        return null
      } else {
        return n
      }
    },
    colorInputInvalid() {
      return colorToByte(this.colorSwatch) === null
    },
  },
  methods: {
    close() {
      this.$emit('close')
    },
    async buy() {
      this.waitingForTx = true
      try {
        let signer = this.$provider.getSigner(this.account)
        let contract = this.$contract.connect(signer)
        await contract.buy(this.pixelID, weiToGWei(this.price), weiToGWei(this.newPrice), this.color)
        this.newPriceInput = ""
      } catch(err) {
        this.$emit('error', 'Failed to send buy transaction: ' + err.message)
      }
      this.waitingForTx = false
      this.$emit('close')
    },
  },
}
</script>