<template>
  <div id="app" class="container">
    <div class="sidebar-container">
      <Sidebar
        :selectedPixel="selectedPixel"
        :cursorPixel="cursorPixel"
        :balance="balance"
        :taxBase="taxBase"
      />
    </div>
    <div class="canvas-container">
      <Canvas
        @pixelSelected="onPixelSelected"
        @cursorPixelChanged="onCursorPixelChanged"
      />
    </div>
    <!-- TODO: errors -->
  </div>
</template>

<script>
import Canvas from "./components/Canvas.vue";
import Sidebar from "./components/Sidebar.vue";
import { balancePollInterval } from "./config.js";
import { gWeiToWei } from "./utils.js";
import { mapState } from "vuex";
import { ethers } from "ethers";

export default {
  name: "App",
  components: {
    Canvas,
    Sidebar,
  },

  data() {
    return {
      selectedPixel: null,
      cursorPixel: null,
      network: null,
      balance: null,
      taxBase: null,
    };
  },

  created() {
    if (this.$provider !== null) {
      this.loadChain();
      this.loadAccount();
    }

    let pollBalanceRepeatedly = () => {
      this.pollBalance().then(
        window.setTimeout(pollBalanceRepeatedly, balancePollInterval)
      );
    };
    pollBalanceRepeatedly();

    this.$contract.on("Bought", (_, seller, buyer) => {
      if (this.account == seller || this.account == buyer) {
        this.loadTaxBase();
      }
    });
  },

  computed: {
    ...mapState([
      "account",
    ]),
  },

  methods: {
    onPixelSelected(coords) {
      this.selectedPixel = coords;
    },
    onCursorPixelChanged(coords) {
      this.cursorPixel = coords;
    },
    onAccountsChanged(accounts) {
      this.balance = null;
      this.taxBase = null;
      if (accounts.length == 0) {
        this.$store.commit("changeAccount", null);
      } else {
        this.$store.commit("changeAccount", ethers.utils.getAddress(accounts[0]));
        this.pollBalance();
        this.loadTaxBase();
      }
    },

    loadChain() {
      const onChainChanged = (chainID) => {
        this.$store.commit("changeChain", ethers.BigNumber.from(chainID).toNumber());
      };
      this.$provider.getNetwork().then(network => {
        onChainChanged(network.chainId);
        window.ethereum.on("chainChanged", onChainChanged);
      });
    },

    loadAccount() {
      this.$provider
        .listAccounts()
        .then(accounts => {
          this.onAccountsChanged(accounts);
        })
        .catch(() => {
          // TODO: error
          // this.$error("Failed to get accounts", error);
        })
        .finally(() => {
          window.ethereum.on("accountsChanged", this.onAccountsChanged);
        });
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
        // TODO: error
        // this.onError("Failed to query account balance: " + err.message);
      }
    },

    loadTaxBase() {
      this.$contract
        .getTaxBase(this.account)
        .then(taxBase => {
          this.taxBase = gWeiToWei(taxBase);
        })
        .catch(() => {
          // TODO: error
        });
    },
  },
};
</script>

<style lang="scss" scoped>
@import "assets/main.scss";

.container {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.sidebar-container {
  width: $sidebar-width;
  height: 100%;
  overflow: auto;
}

.canvas-container {
  flex: 1;
  height: 100%;
}

@media screen and (max-width: $mobile-max-width) {
  .sidebar-container {
    display: none;
  }
}
</style>
