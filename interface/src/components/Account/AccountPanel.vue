<template>
  <article class="panel is-outlined" style="pointer-events: auto;">
    <p class="panel-heading">
      Account
    </p>

    <div v-if="account" class="panel-block">
      <form>
        <div class="field">
          <label class="label">
            Address
          </label>
          <div v-if="account" class="control">
            <p>{{ shortAddress }}</p>
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
            Monthly tax
          </label>
          <div class="control">
            <p>{{ taxPerMonthStr }}</p>
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
import { gWeiToWei, shortenAddress } from '../../utils.js'
import { taxRate } from '../../config.js'

export default {
  name: 'AccountPanel',
  components: {
    DepositField,
    WithdrawField,
  },
  data() {
    return {
      waitingForAccount: false,
      shortenAddress: null,
      balance: null,
      taxBase: null,
    }
  },
  props: [
    "account",
  ],

  mounted() {
    const filters = [
      this.$contract.filters.Deposit(),
      this.$contract.filters.Withdraw(),
    ];
    const updateBalance = (account, amount, balance) => {
      if (this.account !== null && this.account == account) {
        this.balance = gWeiToWei(balance)
      }
    }
    for (let f of filters) {
      this.$contract.on(f, updateBalance)
    }
  },

  watch: {
    account: {
      handler: async function () {
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
      immediate: true,
    },
  },

  computed: {
    balanceStr() {
      if (this.balance) {
        return ethers.utils.formatEther(this.balance) + " DAI"
      } else {
        return "Unknown"
      }
    },
    taxPerMonthStr() {
      if (this.taxBase) {
        const taxPerYear = this.taxBase.mul(Math.round(taxRate * 100000)).div(100000)
        const taxPerDay = taxPerYear.div(12)
        return ethers.utils.formatEther(taxPerDay) + " DAI"
      } else {
        return "Unknown"
      }
    },
    shortAddress() {
      return shortenAddress(this.account)
    },
  },
}
</script>