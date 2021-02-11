<template>
  <article class="panel is-outlined" style="pointer-events: auto;">
    <div class="panel-heading">
      Account
      <button class="delete is-pulled-right" v-on:click="folded = !folded"></button>
    </div>

    <div v-if="account && !folded">
      <div class="panel-block">
        <table class="table is-fullwidth">
          <tbody>
            <tr>
              <th>Address</th>
              <td>{{ shortAddress }}</td>
            </tr>

            <tr>
              <th>Balance</th>
              <td>{{ balanceStr }}</td>
            </tr>

            <tr>
              <th>Monthly Tax</th>
              <td>{{ taxPerMonthStr }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="panel-block">
        <form>
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
            <p>
              (If your balance runs out, you can lose your pixels!)
            </p>
          </div>
        </form>
      </div>
    </div>
  </article>
</template>

<script>
import { ethers } from 'ethers'
import DepositField from './Deposit.vue'
import WithdrawField from './Withdraw.vue'
import { shortenAddress } from '../../utils.js'
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
      folded: false,
    }
  },
  props: [
    "account",
    "balance",
    "taxBase",
  ],

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