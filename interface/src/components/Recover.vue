<template>
  <Panel title="Recover your old balance">
    <div class="panel-block">
        <p>
            There has been a bug in the previous version of the GraffitETH contract.<br>You still hold <b>{{balanceStr}}</b> and you can withdraw it here in intervals, for as long as this panel shows up:
        </p>
    </div> 
    <div class="panel-block">
        <div class="control block has-text-centered">
        <a
            class="button is-success"
            v-bind:class="{'is-loading': waitingForTx}"
            v-on:click="withdraw"
        >
            Withdraw Balance
        </a>
        </div>
    </div> 
  </Panel>
</template>

<script>
import Panel from './Panel.vue'
import { ethers } from 'ethers'
import { weiToGWei } from '../utils.js'

export default {
  name: "RecoverButton",
  props: [
    "account",
    "balance",
  ],
  components: {
    Panel,
  },
  data() {
    return {
      waitingForTx: false,
    }
  },

  computed: {
    balanceStr() {
      if (this.balance) {
        return ethers.utils.formatEther(this.balance) + " xDai"
      } else {
        return "Unknown"
      }
    },
  },

  methods: {
    async withdraw() {

      this.waitingForTx = true
      try {
        let signer = this.$provider.getSigner(this.account)
        let contract = this.$contract.connect(signer)
        await contract.withdraw(weiToGWei(this.balance))
      } catch(err) {
        this.$emit('error', 'Failed to send withdraw transaction: ' + err.message)
      }
      this.waitingForTx = false
    },
  },
}
</script>