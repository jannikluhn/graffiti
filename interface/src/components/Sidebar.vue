<template>
  <div>
    <div v-if="!noWeb3 && !wrongNetwork && account">
      <AccountSidebarSection
        :account="account"
        :balance="balance"
        :taxBase="taxBase"
      />
      <PaintSidebarSection />
      <MyPixelsSection />
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

      <p v-if="!noWeb3 && wrongNetwork">
        You are connected to a wrong network. Please change to xDai and refresh
        the page. If you're using Metamask, find instructions
        <a
          href="https://www.xdaichain.com/for-users/wallets/metamask/metamask-setup"
          >here</a
        >.
      </p>

      <ConnectButton v-if="!noWeb3 && !account" />
    </div>
  </div>
</template>

<script>
import AccountSidebarSection from "./AccountSidebarSection.vue";
import PaintSidebarSection from "./PaintSidebarSection.vue";
import MyPixelsSection from "./MyPixelsSection.vue";
import HelpSection from "./HelpSection.vue";
import ConnectButton from "./ConnectButton.vue";

export default {
  name: "Sidebar",
  props: ["wrongNetwork", "account", "balance", "taxBase"],

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
};
</script>
