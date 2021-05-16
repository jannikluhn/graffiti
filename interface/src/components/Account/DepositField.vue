<template>
  <div class="input">
    <div>
      <input type="text" placeholder="xDai" v-model="amountInput" />
      <p v-if="amountInput && amountInvalid">Invalid deposit amount</p>
    </div>
    <button class="input-btn" :disabled="amountInvalid" @click="deposit">
      Deposit
    </button>
  </div>
</template>

<script>
import { ethers } from "ethers";

export default {
  name: "DepositField",
  props: ["account"],

  data() {
    return {
      amountInput: null,
      waitingForTx: false,
    };
  },

  computed: {
    amount() {
      try {
        return ethers.utils.parseEther(this.amountInput);
      } catch (err) {
        return null;
      }
    },
    amountInvalid() {
      return (
        this.amount === null || this.amount.lte(0) || this.amount.mod(1e9) != 0
      );
    },
  },

  methods: {
    async deposit() {
      if (this.amountInvalid) {
        return;
      }

      this.waitingForTx = true;
      try {
        let signer = this.$provider.getSigner(this.account);
        let contract = this.$contract.connect(signer);
        await contract.deposit({ value: this.amount });
        this.amountInput = "";
      } catch (err) {
        this.$emit(
          "error",
          "Failed to send deposit transaction: " + err.message
        );
      }
      this.waitingForTx = false;
    },
  },
};
</script>
