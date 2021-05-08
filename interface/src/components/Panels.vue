<template>
  <div>
    <div id="i" @click="aboutModalActive = true">?</div>
    <AboutModal
      v-if="aboutModalActive"
      :active="aboutModalActive"
      @close="aboutModalActive = false"
    />
    <div>
      <div v-if="cursorPixel" id="coords">
        {{ cursorPixel[0] }}, {{ cursorPixel[1] }}
      </div>
      <div v-if="!noWeb3 && !wrongNetwork">
        <ConnectPanel
          @error="onError($event)"
          @accountChanged="onAccountChanged"
          :account="account"
          v-if="!wrongNetwork"
        />

        <AccountPanel
          @error="onError($event)"
          :account="account"
          :balance="balance"
          :taxBase="taxBase"
          v-if="account"
        />

        <PixelPanel
          :selectedPixel="selectedPixel"
          :account="account"
          :balance="balance"
          :taxBase="taxBase"
          @error="onError($event)"
        />
        <OwnedPixelPanel
          v-if="account"
          :account="account"
          :canvasSelectedPixel="selectedPixel"
          @error="onError($event)"
        />

        <div v-for="error in errors" :key="error.key">
          <button @click="removeError(error.key)"></button>
          {{ error.message }}
        </div>
      </div>

      <div v-if="noWeb3">
        No web3 provider detected. Please install a web3 wallet such as
        <a href="https://metamask.io/">Metamask</a>.
      </div>
      <div v-if="wrongNetwork !== null && wrongNetwork">
        You are connected to a wrong network. Please change to xDai and refresh
        the page. If you're using Metamask, find instructions
        <a
          href="https://www.xdaichain.com/for-users/wallets/metamask/metamask-setup"
          >here</a
        >.
      </div>
    </div>
  </div>
</template>

<script>
import ConnectPanel from "./ConnectPanel.vue";
import AccountPanel from "./Account/AccountPanel.vue";
import PixelPanel from "./PixelPanel.vue";
import OwnedPixelPanel from "./OwnedPixelPanel.vue";
import AboutModal from "./AboutModal.vue";

import { gWeiToWei } from "../utils";

const balancePollInterval = 4000;

export default {
  name: "Panels",
  components: {
    ConnectPanel,
    AccountPanel,
    PixelPanel,
    OwnedPixelPanel,
    AboutModal,
  },
  props: ["selectedPixel", "cursorPixel", "wrongNetwork"],

  data() {
    return {
      account: null,
      errors: [],
      numErrors: 0,
      aboutModalActive: false,
      balance: null,
      taxBase: null,
      noWeb3: this.$provider === null,
    };
  },

  created() {
    let pollBalanceRepeatedly = () => {
      this.pollBalance().then(
        window.setTimeout(pollBalanceRepeatedly, balancePollInterval)
      );
    };
    pollBalanceRepeatedly();

    this.$contract.on("Bought", (_, seller, buyer) => {
      if (this.account == seller || this.account == buyer) {
        this.$contract.getTaxBase(this.account).then(taxBase => {
          this.taxBase = gWeiToWei(taxBase);
        });
      }
    });
  },

  methods: {
    async onAccountChanged(account) {
      this.account = account;
      this.balance = null;
      this.taxBase = null;
      try {
        let balanceGWei = await this.$contract.getBalance(this.account);
        let taxBaseGWei = await this.$contract.getTaxBase(this.account);
        this.balance = gWeiToWei(balanceGWei);
        this.taxBase = gWeiToWei(taxBaseGWei);
      } catch (err) {
        this.balance = null;
        this.taxBase = null;
        this.onError("Failed to query account state: " + err.message);
      }
    },

    async pollBalance() {
      if (!this.account) {
        this.balance = null;
        return;
      }

      try {
        let balanceGWei = await this.$contract.getBalance(this.account);
        this.balance = gWeiToWei(balanceGWei);
      } catch (err) {
        this.balance = null;
        this.onError("Failed to query account balance: " + err.message);
      }
    },

    onError(e) {
      this.errors.push({
        message: e,
        key: this.numErrors,
      });
      this.numErrors++;
    },
    removeError(key) {
      let newErrors = [];
      for (let error of this.errors) {
        if (error.key != key) {
          newErrors.push(error);
        }
      }
      this.errors = newErrors;
    },
  },
};
</script>
