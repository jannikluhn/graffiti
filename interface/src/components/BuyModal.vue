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
                <td>{{ formatDAI(price) }}</td>
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
                  Added Monthly Tax
                </label>
                <p>{{ formatDAI(addedTax) }}</p>
              </div>
              <div class="column">
                <label class="label">
                  Total Monthly Tax
                </label>
                <p>{{ formatDAI(totalTax) }}</p>
              </div>
            </div>

            <div class="field columns">
              <div class="column">
                <label class="label">
                  Amount to Deposit
                </label>
                <input class="input is-expanded" type="text" placeholder="DAI" v-model="depositInput">
              </div>
              <div class="column">
                <label class="label">
                  Current balance
                </label>
                <p>{{ formatDAI(balance) }}</p>
              </div>
            </div>

            <div class="field">
              <p>
                The cost of the pixel will be transferred from your deposit to the seller.
                In the end, your balance will be {{ formatDAI(balanceAfterPayment) }} which
                would cover the Harberger taxes for the next {{ taxMonths }} months.
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
import { weiToGWei, weiToEth, colorsHex, colorHexIndices, computeMonthlyTax } from '../utils.js'
import VSwatches from 'vue-swatches'

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
    let newPriceInput = ""
    if (this.price) {
      weiToEth(this.price).toString()
    }
    return {
      newPriceInput: newPriceInput,
      depositInput: "",
      waitingForTx: false,
      colorSwatch: '#ffffff',
      swatches: colorsHex,
      formatDAI(value) {
        if (!value) {
          return "Unknown"
        }
        return ethers.utils.formatEther(value) + ' DAI'
      },
    }
  },
  computed: {
    newPrice() {
      try {
        return ethers.utils.parseEther(this.newPriceInput)
      } catch(err) {
        return null
      }
    },
    newPriceInvalid() {
      return this.newPrice === null || this.newPrice.lt(0)
    },
    deposit() {
      try {
        return ethers.utils.parseEther(this.depositInput)
      } catch(err) {
        return null
      }
    },
    color() {
      return colorHexIndices[this.colorSwatch]
    },
    addedTax() {
      if (!this.newPrice || this.newPrice.lt(0)) {
        return null
      }
      return computeMonthlyTax(this.newPrice)
    },
    totalTax() {
      if (!this.taxBase) {
        return null
      }
      if (!this.addedTax) {
        return computeMonthlyTax(this.taxBase)
      }
      const taxBase = this.taxBase.add(this.newPrice)
      return computeMonthlyTax(taxBase)
    },
    balanceAfterDeposit() {
      if (!this.balance || !this.deposit) {
        return null
      }
      return this.balance.add(this.deposit)
    },
    balanceAfterPayment() {
      if (!this.balanceAfterDeposit || !this.price) {
        return null
      }
      return this.balanceAfterDeposit.sub(this.price)
    },
    taxMonths() {
      if (!this.balanceAfterPayment || !this.totalTax) {
        return null
      }
      const taxBase = this.taxBase.add(this.newPrice)
      const taxPerMonth = computeMonthlyTax(taxBase)
      return this.balanceAfterPayment.div(taxPerMonth)
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