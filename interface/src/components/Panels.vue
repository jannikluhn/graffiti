<template>
  <div class="is-overlay">
    <div>
      <div
        v-if="!wrongNetwork"
        class="is-flex is-flex-wrap-wrap is-flex-direction-column is-align-content-flex-start mt-2 ml-2"
      >
        <ConnectPanel
          v-on:error="onError($event)"
          v-on:accountChanged="onAccountChanged"
          v-bind:account="account"
          v-if="!wrongNetwork"
        />
        <AccountPanel
          v-on:error="onError($event)"
          v-bind:account="account"
          v-bind:balance="balance"
          v-bind:taxBase="taxBase"
          v-if="account"
        />
        <PixelPanel
          v-bind:selectedPixel="selectedPixel"
          v-bind:account="account"
          v-bind:balance="balance"
          v-bind:taxBase="taxBase"
          v-on:error="onError($event)"
        />
        <OwnedPixelPanel
          v-if="account"
          v-bind:account="account"
          v-bind:canvasSelectedPixel="selectedPixel"
          v-on:error="onError($event)"
        />
        <hr class="flex-break">
        <div
          v-for="error in errors"
          v-bind:key="error.key"
          class="notification is-danger error-notification m-4"
        >
          <button class="delete" v-on:click="removeError(error.key)"></button>
          {{ error.message }}
        </div>
      </div>

      <div
        v-if="wrongNetwork !== null && wrongNetwork"
        class="notification is-dark connection-notification m-4"
      >
        You are connected to a wrong network. Please change to xDai and refresh the page.
      </div>

      <div v-if="cursorPixel" id="coords">{{ cursorPixel[0] }}, {{ cursorPixel[1] }}</div>
    </div>

    <div id="i" v-on:click="aboutModalActive = true">?</div>
    <AboutModal
      v-if="aboutModalActive"
      v-bind:active="aboutModalActive"
      v-on:close="aboutModalActive = false"
    />
  </div>
</template>

<script>
import ConnectPanel from './ConnectPanel.vue'
import AccountPanel from './Account/AccountPanel.vue'
import PixelPanel from './PixelPanel.vue'
import OwnedPixelPanel from './OwnedPixelPanel.vue'
import AboutModal from './AboutModal.vue'

import { ethers } from 'ethers'
import { gWeiToWei } from '../utils'

export default {
  name: "Panels",
  components: {
    ConnectPanel,
    AccountPanel,
    PixelPanel,
    OwnedPixelPanel,
    AboutModal,
  },
  props: [
    "selectedPixel",
    "cursorPixel",
    "wrongNetwork",
  ],

  data() {
    return {
      account: null,
      errors: [],
      numErrors: 0,
      aboutModalActive: false,
      balance: null,
      taxBase: null,
    }
  },

  methods: {
    async onAccountChanged(account) {
      this.account = account
      this.balance = null
      this.taxBase = null
      try {
        let balanceGWei = await this.$contract.getBalance(this.account)
        let taxBaseGWei = await this.$contract.getTaxBase(this.account)
        this.balance = gWeiToWei(balanceGWei)
        this.taxBase = gWeiToWei(taxBaseGWei)
      } catch(err) {
        this.balance = ethers.BigNumber.from(0)
        this.taxBase = ethers.BigNumber.from(0)
        this.onError('Failed to query account state: ' + err.message)
      }

      this.$contract.on("Deposit", (account, amount, balance) => {
        if (account != this.account) {
          return
        }
        if (this.balance === null) {
          this.balance = gWeiToWei(balance)
        } else {
          this.balance = this.balance.add(gWeiToWei(amount))
        }
      })
      this.$contract.on("Withdraw", (account, amount, balance) => {
        if (account != this.account) {
          return
        }
        if (this.balance === null) {
          this.balance = gWeiToWei(balance)
        } else {
          this.balance = this.balance.sub(gWeiToWei(amount))
        }
      })
      this.$contract.on("Buy", (pixelID, seller, buyer, price) => {
        if (this.balance === null) {
          return
        }
        if (this.account == seller) {
          this.balance = this.balance.add(gWeiToWei(price))
          this.taxBase = this.taxBase.sub(gWeiToWei(price))
        }
        if (this.account == buyer) {
          this.balance = this.balance.sub(gWeiToWei(price))
          // find out the new price and increase tax base accordingly
          // TODO: use getNominalPrice, or even better get the new price from the price change
          // event
          this.$contract.getPrice(pixelID).then((price) => {
            this.taxBase = this.taxBase.add(gWeiToWei(price))
          })
        }
      })
    },

    onError(e) {
      this.errors.push({
        message: e,
        key: this.numErrors,
      })
      this.numErrors++
    },
    removeError(key) {
      let newErrors = []
      for (let error of this.errors) {
        if (error.key != key) {
          newErrors.push(error)
        }
      }
      this.errors = newErrors
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../assets/constants.scss';

.is-overlay {
  pointer-events: none;
}

.is-flex {
  height: 100vh;
}

.flex-break {
  height: 100%;
}

.error-notification {
  width: $panel-width;
  pointer-events: auto;
}

.connection-notification {
  width: $panel-width;
  pointer-events: auto;
}
</style>