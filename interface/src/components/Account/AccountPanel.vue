<template>
  <Panel title="Account">
    <div>
      <table>
        <tbody>
          <tr>
            <th>Address</th>
            <td><AddressLink v-bind:address="account" /></td>
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
    <div>
      <form>
        <div>
          <label>
            Manage account balance
          </label>
          <DepositField
            v-bind:account="account"
            v-on:error="msg => $emit('error', msg)"
          />
          <WithdrawField
            v-bind:account="account"
            v-bind:balance="balance"
            v-on:error="msg => $emit('error', msg)"
          />
          <p>
            (If your balance runs out, you can lose your pixels!)
          </p>
        </div>
      </form>
    </div>
  </Panel>
</template>

<script>
import { ethers } from "ethers";
import Panel from "../Panel.vue";
import DepositField from "./Deposit.vue";
import WithdrawField from "./Withdraw.vue";
import AddressLink from "../AddressLink.vue";
import { taxRate } from "../../config.js";

export default {
  name: "AccountPanel",
  props: ["account", "balance", "taxBase"],
  components: {
    Panel,
    DepositField,
    WithdrawField,
    AddressLink,
  },
  data() {
    return {
      waitingForAccount: false,
    };
  },

  computed: {
    balanceStr() {
      if (this.balance) {
        return ethers.utils.formatEther(this.balance) + " xDai";
      } else {
        return "Unknown";
      }
    },
    taxPerMonthStr() {
      if (this.taxBase) {
        const taxPerYear = this.taxBase
          .mul(Math.round(taxRate * 100000))
          .div(100000);
        const taxPerDay = taxPerYear.div(12);
        return ethers.utils.formatEther(taxPerDay) + " xDai";
      } else {
        return "Unknown";
      }
    },
  },
};
</script>
