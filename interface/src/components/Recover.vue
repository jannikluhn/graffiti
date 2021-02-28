<template>
  <Panel
    v-if="account && balanceNonDusty"
    title="Recover Balance"
    class="is-danger"
  >
    <div class="panel-block">
      <div class="content">
        <p>
          Unfortunately, there was a bug in the GraffitETH contract. It has been fixed in the new
          version you can see here, but you still hold a balance of
          <strong>{{ balanceStr }}</strong> in the old version.
        </p>
        <p>
          You can safely recover your balance, but due to the nature of the bug this must happen
          in small chunks of up to 18 xDai. Press the button below to withdraw the next chunk.
          Wait for the transaction to be confirmed and your balance to be updated before pressing
          it again.
        </p>
        <p>
          Taxes that you already paid will be refunded in full over the course of the following
          weeks. They will appear as deposits in the new contract. Pixels you owned in the
          previous version are yours in the new version, too. Taxes have been disabled until
          Monday, 8th of March.
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
import { gWeiToWei } from '../utils'

const maxSafeWithdrawal = ethers.utils.parseEther("18")
const dustThreshold = ethers.utils.parseEther("0.001")

export default {
  name: "RecoverPanel",
  props: [
    "account",
  ],
  components: {
    Panel,
  },
  data() {
    return {
      waitingForTx: false,
      balance: null,
      taxBase: null,
    }
  },

  watch: {
    account: {
      async handler() {
        this.updateBalance()
      },
      immediate: true,
    },
  },

  computed: {
    balanceNonDusty() {
      return this.balance !== null && this.balance.gte(dustThreshold)
    },
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
        let contractV1 = this.$contractV1.connect(signer)
        let tx = await contractV1.withdraw(
          weiToGWei(this.withdrawAmount),
          {gasLimit: 200000},
        )
        await tx.wait()
      } catch(err) {
        this.$emit('error', 'Failed to send withdraw transaction: ' + err.message)
      }

      await this.updateBalance();

      this.waitingForTx = false
    },

    async updateBalance() {
      if (!this.account) {
        this.balance = null;
        this.taxBase = null;
        return
      }

      try {
        let balanceGWei = await this.$contractV1.getBalance(this.account)
        let taxBaseGWei = await this.$contractV1.getTaxBase(this.account)
        this.balance = gWeiToWei(balanceGWei)
        this.taxBase = gWeiToWei(taxBaseGWei)
      } catch (err) {
        this.balance = null
        this.taxBase = null
        this.$emit('error', 'Failed to query account state in v1 contract: ' + err.message)
      }
    }
  },
}
</script>