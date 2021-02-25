<template>
  <Panel title="Recover Balance" class="is-danger">
    <div class="panel-block">
      <div class="content">
        <p>
          Unfortunately, there was a bug in the GraffitETH contract. It has been fixed in the new
          version you can see here, but you still hold a balance of
          <strong>{{ balanceStr }}</strong> in the old version.
        </p>
        <p>
          You can safely withdraw your balance, but due to the nature of the bug this must happen
          in small chunks of up to 18 xDai. Press the button below to withdraw the next chunk.
        </p>
        <p>
          Taxes that you already paid will be refunded in full over the following weeks. Pixels you
          owned in the previous version are yours in the new version, too. As a little apology
          gift, you won't have to pay any taxes for them as long as you don't change their price
          or until they are bought from you.
        </p>
        <p>
          This panel will disappear as soon as all of your balance is withdrawn.
        </p>
      </div>
    </div> 
    <div class="panel-block">
        <div class="control block has-text-centered">
        <a
          class="button is-danger"
          v-bind:class="{'is-loading': waitingForTx}"
          v-on:click="withdraw"
          v-bind:disabled="!balance || !taxBase"
        >
            Withdraw Next Chunk
        </a>
        </div>
    </div> 
  </Panel>
</template>

<script>
import Panel from './Panel.vue'
import { ethers } from 'ethers'
import { computeMonthlyTax, weiToGWei } from '../utils'

const maxSafeWithdrawal = ethers.utils.parseEther("18")

export default {
  name: "RecoverPanel",
  props: [
    "account",
    "balance",
    "taxBase",
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
    withdrawAmount() {
      if (!this.balance || !this.taxBase) {
        return null
      }
      const taxPerMinute = computeMonthlyTax(this.taxBase).div(30 * 24 * 60)
      const balanceAtWithdrawal = this.balance.sub(taxPerMinute)
      if (balanceAtWithdrawal.gte(maxSafeWithdrawal)) {
        return maxSafeWithdrawal
      } else if (balanceAtWithdrawal.gt(0)) {
        return balanceAtWithdrawal;
      } else {
        return 0
      }
    },
  },

  methods: {
    async withdraw() {
      if (!this.balance || !this.taxBase) {
        return
      }
      this.waitingForTx = true
      try {
        let signer = this.$provider.getSigner(this.account)
        let contract = this.$contract.connect(signer)
        await contract.withdraw(weiToGWei(this.withdrawAmount))
      } catch(err) {
        this.$emit('error', 'Failed to send withdraw transaction: ' + err.message)
      }
      this.waitingForTx = false
    },
  },
}
</script>