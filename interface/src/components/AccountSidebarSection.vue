<template>
  <SidebarSection title="Account">
    <table>
      <tbody>
        <tr>
          <th>Address</th>
          <td><AddressLink :address="account" /></td>
        </tr>
        <tr>
          <th>Balance</th>
          <td>{{ balanceStr }}</td>
        </tr>
        <tr>
          <th>Monthly Tax</th>
          <td>{{ monthlyTaxStr }}</td>
        </tr>
      </tbody>
    </table>
    <div>
      <DepositField :account="account" />
      <WithdrawField :account="account" :balance="balance" />
    </div>
  </SidebarSection>
</template>

<script>
import { mapState } from "vuex";
import SidebarSection from "./SidebarSection.vue";
import AddressLink from "./AddressLink.vue";
import { computeMonthlyTax, formatXDai } from "../utils";
import DepositField from "./Account/DepositField.vue";
import WithdrawField from "./Account/WithdrawField.vue";

export default {
  name: "AccountSidebarSection",
  props: ["balance", "taxBase"],

  components: {
    AddressLink,
    SidebarSection,
    DepositField,
    WithdrawField,
  },

  data() {
    return {
      modalActive: false,
    };
  },

  computed: {
    balanceStr() {
      return formatXDai(this.balance);
    },
    monthlyTaxStr() {
      const monthlyTax = this.taxBase ? computeMonthlyTax(this.taxBase) : null;
      return formatXDai(monthlyTax);
    },
    ...mapState(["account"]),
  },
};
</script>
