<template>
  <div class="is-overlay" style="pointer-events: none;">
    <section class="section">
      <div class="columns">
        <div v-if="!wrongNetwork" class="column is-narrow">
          <ConnectPanel
            v-on:error="onError($event)"
            v-on:accountChanged="onAccountChanged"
            v-bind:account="account"
            v-if="!wrongNetwork"
          />
          <AccountPanel
            v-on:error="onError($event)"
            v-bind:account="account"
          />
          <PixelPanel
            v-bind:selectedPixel="selectedPixel"
            v-bind:account="account"
            v-on:error="onError($event)"
          />
        </div>
        <div v-if="wrongNetwork !== null && wrongNetwork">
          <div class="notification is-dark" style="pointer-events: auto;">
              Wrong Network ☹️ Please change to Goerli Testnet and refresh the page.
          </div>
        </div>
        <div class="column is-narrow">
          <div v-for="error in errors" v-bind:key="error.key" class="notification is-danger" style="pointer-events: auto;">
            <button class="delete" v-on:click="removeError(error.key)"></button>
            {{ error.message }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import ConnectPanel from './ConnectPanel.vue'
import AccountPanel from './Account/AccountPanel.vue'
import PixelPanel from './PixelPanel.vue'

export default {
  name: "Panels",
  components: {
    ConnectPanel,
    AccountPanel,
    PixelPanel,
  },
  props: [
    "selectedPixel",
    "wrongNetwork",
  ],

  data() {
    return {
      account: null,
      errors: [],
      numErrors: 0,
    }
  },

  methods: {
    onAccountChanged(account) {
      this.account = account
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