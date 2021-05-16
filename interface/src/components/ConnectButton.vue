<template>
  <button @click="connect" :disabled="waiting" class="rainbow">Connect</button>
</template>

<script>
export default {
  name: "ConnectButton",

  data() {
    return {
      waiting: false,
    };
  },

  methods: {
    async connect() {
      this.waiting = true;
      try {
        await window.ethereum.request({
          method: "eth_requestAccounts",
        });
      } catch (err) {
        // TODO: errors
        // this.$emit("error", "Failed to requests accounts: " + err.message);
      }
      this.waiting = false;
    },
  },
};
</script>
