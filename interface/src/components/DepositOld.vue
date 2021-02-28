<template>
  <Panel
    v-if="account"
    title="Deposit to old contract"
    class="is-danger"
  >
    <div class="panel-block">
      <div class="field has-addons">
        <div class="control">
          <input class="input" type="text" placeholder="xDai" v-model="amountInput">
        <p v-if="amountInput && amountInvalid" class="help is-danger">Invalid deposit amount</p>
        </div>
        <div class="control">
          <a
            class="button is-dark"
            v-bind:class="{'is-loading': waitingForTx}"
            v-bind:disabled="amountInvalid"
            v-on:click="deposit"
          >
            Deposit
          </a>
        </div>
      </div>
    </div>
  </Panel>
</template>

<script>
import Panel from './Panel.vue'
import { ethers } from 'ethers'
import { gWeiToWei } from '../utils'

export default {
  name: "DepositOld",
  props: [
    "account",
  ],
  components: {
    Panel,
  },
  data() {
    return {
      amountInput: null,
      waitingForTx: false,
    }
  },

  computed: {
    amount() {
      try {
        return ethers.utils.parseEther(this.amountInput)
      } catch(err) {
        return null
      }
    },
    amountInvalid() {
      return this.amount === null || this.amount.lte(0) || this.amount.mod(1e9) != 0
    },
  },

  watch: {
    account: {
      async handler() {
        this.updateBalance()
      },
      immediate: true,
    },
  },

  methods: {
    async deposit() {
      if (this.amountInvalid) {
        return
      }

      this.waitingForTx = true
      try {
        let signer = this.$provider.getSigner(this.account)
        let contractV1 = this.$contractV1.connect(signer)
        let tx = await contractV1.deposit({value: this.amount})
        this.amountInput = ""
        await tx.wait()
      } catch(err) {
        this.$emit('error', 'Failed to send deposit transaction: ' + err.message)
      }
      await this.updateBalance()
      this.waitingForTx = false
    },
    async updateBalance() {
      if (!this.account) {
        this.balance = null;
        return
      }

      try {
        let balanceGWei = await this.$contractV1.getBalance(this.account)
        this.balance = gWeiToWei(balanceGWei)
      } catch (err) {
        this.balance = null
        this.$emit('error', 'Failed to query account state in v1 contract: ' + err.message)
      }
    },
  },
}
</script>