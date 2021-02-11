<template>
  <div class="modal is-fullwidth" v-bind:class="{'is-active': active}">
    <div class="modal-background"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Buy Pixel</p>
          <button class="delete" aria-label="close" v-on:click="close()"></button>
        </header>

        <section class="modal-card-body">
          <table class="table is-fullwidth has-text-centered">
            <thead>
              <th>Pixel ID</th>
              <th>Coordinates</th>
              <th>Price</th>
            </thead>
            <tbody>
              <tr>
                <td>{{ pixelID }}</td>
                <td>{{ pixelID }}</td>
                <td>{{ priceStr }}</td>
              </tr>
            </tbody>
          </table>

          <form>
            <div class="field">
              <label class="label">
                New Color
              </label>
              <div class="control">
                <v-swatches 
                  v-model="colorSwatch" 
                  :swatches="swatches"
                  show-border
                ></v-swatches>
              </div>
            </div>

            <div class="field columns">
              <div class="column">
                <label class="label">
                  New Price
                </label>
                <input class="input is-expanded" type="text" placeholder="DAI" v-model="newPriceInput">
                <p v-if="newPriceInput && newPriceInvalid" class="help is-danger">Invalid price</p>
              </div>
              <div class="column">
                <label class="label">
                  Resulting Monthly Tax
                </label>
                <p>{{ taxStr }}</p>
              </div>
            </div>

            <div class="field columns">
              <div class="column">
                <label class="label">
                  Amount to Deposit
                </label>
                <input class="input is-expanded" type="text" placeholder="DAI" v-model="newPriceInput">
              </div>
              <div class="column">
                <label class="label">
                  Current balance
                </label>
                <p>{{ balanceStr }}</p>
              </div>
            </div>

            <div class="field">
              <p>
                The cost of the pixel will be transferred from your deposit to the seller.
                Subsequently, your balance will be xxx and hold enough funds for yyy months worth
                of Harberger taxes.
              </p>
            </div>
          </form>
        </section>

        <footer class="modal-card-foot">
          <button
            class="button is-dark"
            v-bind:class="{'is-loading': waitingForTx}"
            v-bind:disabled="newPriceInvalid"
            v-on:click="buy()"
          >Buy</button>
          <button class="button" v-on:click="close()">Cancel</button>
        </footer>
    </div>
  </div>
</template>

<script>
import { ethers } from 'ethers'
import { weiToGWei, weiToEth, colorsHex, colorHexIndices } from '../utils.js'
import VSwatches from 'vue-swatches'
import { taxRate } from '../config.js'

export default {
  name: "BuyModal",
  components: { VSwatches },
  props: [
    "active",
    "price",
    "pixelID",
    "account",
    "balance",
    "taxBase",
  ],
  data() {
    console.log(this.balance)
    let newPriceInput = ""
    if (this.price) {
      weiToEth(this.price).toString()
    }
    return {
      newPriceInput: newPriceInput,
      waitingForTx: false,
      colorSwatch: '#ffffff',
      swatches: colorsHex,
    }
  },
  computed: {
    priceStr() {
      if (this.price) {
        return ethers.utils.formatEther(this.price) + ' DAI'
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
      return colorHexIndices[this.colorSwatch]
    },
    taxStr() {
      if (!this.newPrice) {
        return "Unknown"
      }
      const t = this.newPrice.mul(Math.round(taxRate * 100000)).div(100000).div(12)
      return ethers.utils.formatEther(t) + ' DAI'
    },
    balanceStr() {
      if (!this.balance) {
        return "Unknown"
      }
      return ethers.utils.formatEther(this.balance) + ' DAI'
    }
  },
  watch: {
    price: {
      handler() {
        this.newPriceInput = ethers.utils.formatEther(this.price)
      },
      immediate: true,
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

<style>
.vue-swatches__trigger {
  box-shadow: inset 0 0 2px rgba(0,0,0,.75);
}
</style>