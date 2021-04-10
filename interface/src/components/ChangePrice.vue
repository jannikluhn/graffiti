<template>
  <div class="field has-addons">
    <div class="control">
      <input class="input" type="text" placeholder="xDai" v-model="priceInput">
    <p v-if="priceInput && priceInvalid" class="help is-danger">Invalid price</p>
    </div>
    <div class="control">
      <a
        class="button is-dark"
        v-bind:class="{'is-loading': waitingForTx}"
        v-bind:disabled="priceInvalid"
        v-on:click="changePrice"
      >
        Change Price
      </a>
    </div>
  </div>
</template>

<script>
import { ethers } from 'ethers'
import { weiToGWei } from '../utils'

export default {
  name: "ChangePriceField",
  props: [
    "account",
    "pixelID",
  ],

  data() {
    return {
      priceInput: null,
      waitingForTx: false,
    }
  },

  computed: {
    price() {
      try {
        return ethers.utils.parseEther(this.priceInput)
      } catch(err) {
        return null
      }
    },
    priceInvalid() {
      return this.price === null || this.price <= 0 || this.price % 1e9 != 0
    },
  },

  methods: {
    async changePrice() {
      if (this.priceInvalid) {
        return
      }

      this.waitingForTx = true
      try {
        let signer = this.$provider.getSigner(this.account)
        let contract = this.$contract.connect(signer)
        await contract.edit(
          this.account,
          [],
          [],
          [[this.pixelID, weiToGWei(this.price)]],
        )
        this.priceInput = ""
      } catch(err) {
        this.$emit('error', 'Failed to send change price transaction: ' + err.message)
      }
      this.waitingForTx = false
    },
  },
}
</script>