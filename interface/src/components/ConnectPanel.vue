<template>
  <Panel v-if="!account" title="Wallet Connection">
    <div>
      <button
        :class="{ 'is-loading': waitingForAccount }"
        @click="connect"
      >
        Connect
      </button>
    </div>
  </Panel>
</template>

<script>
import { ethers } from "ethers";
import Panel from "./Panel.vue";

export default {
  name: "ConnectPanel",
  props: ["account"],
  components: {
    Panel,
  },
  data() {
    return {
      waitingForAccount: false,
    };
  },

  created() {
    window.ethereum.on("accountsChanged", this.onAccountsChanged);
    this.$provider.listAccounts().then(accounts => {
      if (accounts.length > 0) {
        this.$emit("accountChanged", accounts[0]);
      }
    });
  },

  methods: {
    async connect() {
      this.waitingForAccount = true;
      let accounts;
      try {
        accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
      } catch (err) {
        this.$emit("error", "Failed to requests accounts: " + err.message);
      }
      this.$emit("accountChanged", ethers.utils.getAddress(accounts[0]));
      this.waitingForAccount = false;
    },

    onAccountsChanged(accounts) {
      if (accounts.length >= 0) {
        this.$emit("accountChanged", ethers.utils.getAddress(accounts[0]));
      } else {
        this.$emit("error", "No connected account.");
      }
    },
  },
};
</script>
