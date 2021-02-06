<template>
  <article class="panel is-primary" style="pointer-events: auto;">
    <p class="panel-heading">
      Account
    </p>

    <div v-if="!account" class="panel-block">
      <button class="button is-fullwidth" v-bind:class="{'is-loading': waitingForAccount}" v-on:click="connect">
        Connect account
      </button>
    </div>

    <div v-if="account" class="panel-block">
      <form>
        <div class="field">
          <label class="label">
            Address
          </label>
          <div v-if="account" class="control">
            <p>{{ account }}</p>
          </div>
          <div v-else class="control">
            <p>No connected accounts.</p>
          </div>
        </div>

        <div class="field">
          <label class="label">
            Balance
          </label>
          <div class="control">
            <p>{{ balanceStr }}</p>
          </div>
        </div>

        <div class="field">
          <label class="label">
            Tax Base
          </label>
          <div class="control">
            <p>{{ taxBaseStr }}</p>
          </div>
        </div>

        <div class="field">
          <label class="label">
            Manage account balance
          </label>
          <DepositField
            v-bind:account="account"
            v-on:error="(msg) => $emit('error', msg)"
          />
          <WithdrawField
            v-bind:account="account"
            v-bind:balance="balance"
            v-on:error="(msg) => $emit('error', msg)"
          />
        </div>
      </form>
    </div>
  </article>
</template>

<script>
import { ethers } from 'ethers'
import DepositField from './Deposit.vue'
import WithdrawField from './Withdraw.vue'
import { gWeiToWei } from '../../utils.js'

export default {
  name: 'AccountPanel',
  components: {
    DepositField,
    WithdrawField,
  },
  data() {
    return {
      waitingForAccount: false,
      account: null,
      balance: null,
      taxBase: null,
    }
  },

  created() {
    window.ethereum.on('accountsChanged', this.onAccountsChanged)
  },

  methods: {
    async connect() {
      this.waitingForAccount = true
      let accounts
      try {
        accounts = await window.ethereum.request({method: 'eth_requestAccounts'})
      } catch(err) {
        this.$emit('error', 'Failed to requests accounts: ' + err.message)
      }
      this.account = accounts[0]
      this.waitingForAccount = false
    },

    onAccountsChanged(accounts) {
      if (accounts.length >= 0) {
        this.account = accounts[0]
      } else {
        this.$emit('error', 'No connected account.')
      }
    }
  },

  watch: {
    async account() {
      if (this.account) {
        try {
          let balanceGWei = await this.$contract.getBalance(this.account)
          let taxBaseGWei = await this.$contract.getTaxBase(this.account)
          this.balance = gWeiToWei(balanceGWei)
          this.taxBase = gWeiToWei(taxBaseGWei)
        } catch(err) {
          this.balance = null
          this.taxBase = null
          this.$emit('error', 'Failed to query account state: ' + err.message)
        }
      } else {
        this.balance = null
        this.taxBase = null
      }
    },
  },

  computed: {
    balanceStr() {
      if (this.balance) {
        return ethers.utils.formatEther(this.balance) + " ETH"
      } else {
        return "Unknown"
      }
    },
    taxBaseStr() {
      if (this.taxBase) {
        return ethers.utils.formatEther(this.taxBase) + " ETH"
      } else {
        return "Unknown"
      }
    },
  },
}
</script>