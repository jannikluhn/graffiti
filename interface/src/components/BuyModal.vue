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
                <td>{{ selectedPixel[0] }}, {{ selectedPixel[1] }}</td>
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
                  New Price (xDai)
                </label>
                <input
                  class="input is-expanded"
                  v-bind:class="{
                    'is-danger': newPriceInput && newPriceInvalid,
                  }"
                  type="text"
                  placeholder="xDai"
                  v-model="newPriceInput"
                >
              </div>
              <div class="column">
                <label class="label">
                  Added Monthly Tax
                </label>
                <p>{{ formatDAI(addedTax) }}</p>
              </div>
            </div>

            <div v-if="totalTax !== null && !newPriceInvalid && newPrice.gt(0)" class="field has-text-success">
              Your monthly tax will increase to {{ formatDAI(totalTax) }}.
            </div>
            <div v-if="totalTax !== null && !newPriceInvalid && newPrice.eq(0)" class="field has-text-success">
              Your monthly tax will remain unchanged at {{ formatDAI(totalTax) }}.
            </div>

            <div class="field columns">
              <div class="column">
                <label class="label">
                  Amount to Deposit (xDai)
                </label>
                <input
                  class="input is-expanded"
                  v-bind:class="{
                    'is-danger': depositInput && depositInvalid,
                  }"
                  type="text"
                  placeholder="xDai"
                  v-model="depositInput"
                >
              </div>
              <div class="column">
                <label class="label">
                  Current balance
                </label>
                <p>{{ formatDAI(balance) }}</p>
              </div>
            </div>

            <div class="field">
              <p
                v-if="(newPriceInput != '' && newPriceInvalid) || (depositInput != '' && depositInvalid)"
                class="has-text-danger"
              >
                Some of your inputs are invalid. Please make sure the new price and the deposit
                amount are properly formatted, are not negative, and are not too fractional.
              </p>
              <p
                v-if="!inputsInvalid && totalDepositCoversCost && totalDepositSufficient"
                class="has-text-success"
              >
                The cost of the pixel will be transferred from your deposit to the seller.
                After the transaction is complete, your balance will be
                {{ formatDAI(balanceAfterPayment) }} which would
                {{ !noTaxesPaid
                  ? "cover the Harberger taxes for the next " + taxMonths + " months."
                  : "last forever as you don't pay any taxes at the moment"
                }}
              </p>
              <p
                v-if="!inputsInvalid && !totalDepositCoversCost"
                class="has-text-danger"
              >
                Your current balance is insufficient to pay for the pixel. Please increase the
                deposit amount by at least {{ formatDAI(balanceAfterPayment.mul(-1)) }}.
              </p>
              <p
                v-if="!inputsInvalid && totalDepositCoversCost && !totalDepositSufficient && !noTaxesPaid"
                class="has-text-warning"
              >
                Your current deposit is sufficient to pay for the pixel, but not much will be left
                to pay for Harberger taxes. If you don't increase your deposit, you risk losing all
                your pixels in the near future. It is recommended to increase the deposit amount by
                {{ formatDAI(balanceAfterPayment.sub(totalTax.mul(recommendedMonths)).mul(-1)) }} or
                more to be on the safe side.
              </p>
            </div>
          </form>
        </section>

        <footer class="modal-card-foot">
          <button
            class="button is-dark"
            v-bind:class="{'is-loading': waitingForTx}"
            v-bind:disabled="buyButtonDisabled"
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
    "selectedPixel"
  ],
  data() {
    let newPriceInput = ""
    if (this.price) {
      weiToEth(this.price).toString()
    }
    return {
      newPriceInput: newPriceInput,
      depositInput: "0",
      waitingForTx: false,
      colorSwatch: '#ffffff',
      swatches: colorsHex,
      recommendedMonths: 3,
      formatDAI(value) {
        if (!value) {
          return "Unknown"
        }
        return ethers.utils.formatEther(value) + ' xDai'
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
      return this.newPrice === null || this.newPrice.lt(0) || this.newPrice.mod(1e9) != 0
    },
    deposit() {
      try {
        return ethers.utils.parseEther(this.depositInput)
      } catch(err) {
        return null
      }
    },
    depositInvalid() {
      return this.deposit === null || this.deposit.lt(0) || this.deposit.mod(1e9) != 0
    },
    inputsInvalid() {
      return this.newPriceInvalid || this.depositInvalid
    },
    color() {
      return colorHexIndices[this.colorSwatch]
    },
    addedTax() {
      if (this.newPriceInvalid) {
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
    noTaxesPaid() {
      if (this.newPriceInvalid || this.taxBase === null) {
        return null
      }
      const taxBase = this.taxBase.add(this.newPrice)
      return taxBase.eq(0)
    },
    taxMonths() {
      if (!this.balanceAfterPayment || !this.totalTax || this.newPriceInvalid || this.noTaxesPaid) {
        return null
      }
      const taxBase = this.taxBase.add(this.newPrice)
      const taxPerMonth = computeMonthlyTax(taxBase)
      return this.balanceAfterPayment.div(taxPerMonth)
    },
    totalDepositCoversCost() {
      if (this.balanceAfterPayment === null) {
        return null
      }
      return this.balanceAfterPayment.gte(0)
    },
    totalDepositSufficient() {
      if (this.noTaxesPaid) {
        return true
      }
      if (this.taxMonths === null) {
        return null
      }
      return this.totalDepositCoversCost && this.taxMonths.gte(this.recommendedMonths)
    },
    buyButtonDisabled() {
      return this.newPriceInvalid || this.depositInvalid || !this.totalDepositCoversCost
    },
  },
  watch: {
    price: {
      handler() {
        if (this.price !== null) {
          this.newPriceInput = ethers.utils.formatEther(this.price)
        } else {
          this.newPriceInput = ""
        }
      },
      immediate: true,
    },
  },
  methods: {
    close() {
      this.$emit('close')
    },
    async buy() {
      if (this.buyButtonDisabled) {
        return
      }

      this.waitingForTx = true
      try {
        let signer = this.$provider.getSigner(this.account)
        let contract = this.$contract.connect(signer)
        await contract.depositAndBuy(
          this.pixelID,
          weiToGWei(this.price),
          weiToGWei(this.newPrice),
          this.color,
          {value: this.deposit,
        }
        )
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