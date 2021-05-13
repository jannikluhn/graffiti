<template>
  <div v-if="!noWeb3 && !wrongChain && account">
    <img src="../assets/logoRainbow.svg" width=90% alt="">
    <AccountSidebarSection
      :balance="balance"
      :taxBase="taxBase"
    />
    <PaintSidebarSection
      :balance="balance"
      :taxBase="taxBase"
      :selectedPixel="selectedPixel"
    />
    <MyPixelsSection
      :canvasSelectedPixel="selectedPixel"
    />
    <HelpSection />
  </div>
  <div v-else>
    <p>
      Welcome to GraffitETH, the collaborative Ethereum graffiti wall!
    </p>

    <p v-if="noWeb3">
      No web3 provider detected. Please install a web3 wallet such as
      <a href="https://metamask.io/">Metamask</a>.
    </p>

    <p v-if="!noWeb3 && wrongChain">
      GraffitETH lives on xDai, but you are connected to a different chain. Please change to xDai and refresh
      the page. If you're using Metamask, find instructions
      <a
        href="https://www.xdaichain.com/for-users/wallets/metamask/metamask-setup"
        >here</a
      >.
    </p>

    <ConnectButton v-if="!noWeb3 && !account" />
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

    ...mapState([
      "account",
    ])
  },
};
</script>
