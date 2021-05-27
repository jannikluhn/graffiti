<template>
  <div class="sidebar">
    <img src="../assets/logoRainbow.svg" width=90% alt="" class="logo">
    <div v-if="!noWeb3 && !wrongNetwork && account">
      <AccountSidebarSection
        :account="account"
        :balance="balance"
        :taxBase="taxBase"
      />
      <PaintSidebarSection
        :account="account"
        :balance="balance"
        :taxBase="taxBase"
        :selectedPixel="selectedPixel"
      />
      <MyPixelsSection
        
        :account="account"
        :canvasSelectedPixel="selectedPixel"
      />
    </div>
    <div v-else>
      <p v-if="noWeb3">
        No web3 provider detected. Please install a web3 wallet such as
        <a href="https://metamask.io/">Metamask</a>.
      </p>
      <p v-if="!noWeb3 && wrongNetwork">
        You are connected to a wrong network. Please change to xDai and refresh
        the page. If you're using Metamask, find instructions
        <a
          href="https://www.xdaichain.com/for-users/wallets/metamask/metamask-setup"
          >here</a
        >.
      </p>
      <p>
        Welcome to GraffitETH, the collaborative Ethereum graffiti wall!
      </p>
      <ConnectButton v-if="!noWeb3 && !account" />
    </div>
    <HelpSection class="help-section" />
  </div>
</template>

<script>
import { mapState } from "vuex";
import * as config from "../config.js";
import AccountSidebarSection from "./AccountSidebarSection.vue";
import PaintSidebarSection from "./PaintSidebarSection.vue";
import MyPixelsSection from "./MyPixelsSection.vue";
import HelpSection from "./HelpSection.vue";
import ConnectButton from "./ConnectButton.vue";

export default {
  name: "Sidebar",
  props: ["balance", "taxBase", "selectedPixel"],

  components: {
    AccountSidebarSection,
    PaintSidebarSection,
    MyPixelsSection,
    HelpSection,
    ConnectButton,
  },

  data() {
    return {
      noWeb3: this.$provider === null,
    };
  },
  computed: {
    wrongChain() {
      const chainID = this.$store.state.chainID;
      if (chainID == null) {
        return null;
      }
      return chainID != config.chainID;
    },

    ...mapState(["account"]),
  },
};
</script>
