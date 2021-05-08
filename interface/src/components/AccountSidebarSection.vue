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
    <button @click="modalActive = true">Show Modal</button>
    <Modal title="Modal" :active="modalActive" @close="modalActive = false">
      <p>Modal body</p>
    </Modal>
  </SidebarSection>
</template>

<script>
import SidebarSection from "./SidebarSection.vue";
import AddressLink from "./AddressLink.vue";
import Modal from "./Modal.vue";
import { computeMonthlyTax, formatXDai } from "../utils";

export default {
  name: "AccountSidebarSection",
  props: ["account", "balance", "taxBase"],

  components: {
    AddressLink,
    SidebarSection,
    Modal,
  },

  data() {
    return {
      modalActive: false,
    };
  },

  computed: {
    balanceStr() {
      console.log(this.account);
      return formatXDai(this.balance);
    },
    monthlyTaxStr() {
      const monthlyTax = this.taxBase ? computeMonthlyTax(this.taxBase) : null;
      return formatXDai(monthlyTax);
    },
  },
};
</script>
