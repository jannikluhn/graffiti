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
                PixelID
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
              </div>
            </div>

            <div class="field">
              <label class="label">
                Color value
              </label>
              <div class="control">
                <input class="input" type="text" placeholder="Color" v-model="colorInput">
                <p v-if="colorInput && colorInputInvalid" class="help is-danger">Invalid color</p>
              </div>
            </div>
          </form>
        </section>

        <footer class="modal-card-foot">
          <button
            class="button is-primary"
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
import { weiToGWei, weiToEth } from '../utils.js'

export default {
  name: "BuyModal",
  props: [
    "active",
    "price",
    "pixelID",
    "account",
  ],
  data() {
    return {
      newPriceInput: weiToEth(this.price).toString(),
      colorInput: "0",
      waitingForTx: false,
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
      let n = Number(this.colorInput)
      if (isNaN(n) || !Number.isInteger(n) || n < 0 || n > 255) {
        return null
      } else {
        return n
      }
    },
    colorInputInvalid() {
      return this.color === null
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
        await contract.buyPixel(this.pixelID, weiToGWei(this.price), weiToGWei(this.newPrice), this.color)
        this.newPriceInput = ""
      } catch(err) {
        this.$emit('error', 'Failed to send withdraw transaction: ' + err.message)
      }
      this.waitingForTx = false
      this.$emit('close')
    },
  },
}
</script>