<template>
  <a v-bind:href="blockscoutURL">{{ shortAddress }}</a>
</template>

<script>
import { shortenAddress } from '../utils.js'

export default {
  name: "AddressLink",
  props: [
    "address",
  ],
  computed: {
    shortAddress() {
      if (this.address === null) {
          return ""
      }
      return shortenAddress(this.address)
    },
    blockscoutURL() {
        if (this.address === null) {
            return ""
        }
      return "https://blockscout.com/poa/xdai/address/" + this.address
    }
  },
}
</script>