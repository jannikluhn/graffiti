<template>
  <div class="is-overlay" style="pointer-events: none;">
    <section class="section">
      <div class="columns">
        <div class="column is-narrow">
          <AccountPanel
            v-on:error="onError($event)"
          />
          <PixelPanel
            v-bind:selectedPixel="selectedPixel"
            v-on:error="onError($event)"
          />
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
import AccountPanel from './Account/AccountPanel.vue'
import PixelPanel from './PixelPanel.vue'

export default {
  name: "Panels",
  components: {
    AccountPanel,
    PixelPanel,
  },
  props: [
    "selectedPixel",
  ],

  data() {
    return {
      errors: [],
      numErrors: 0,
    }
  },

  methods: {
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