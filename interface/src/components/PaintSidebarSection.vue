<template>
  <SidebarSection title="Paint">
    <div v-if="selectedPixel">
      <table>
        <tbody>
          <tr>
            <th>Coordinates</th>
            <td>{{ selectedPixel[0] }}, {{ selectedPixel[1] }}</td>
          </tr>
          <tr>
            <th>Pixel ID</th>
            <td>{{ pixelID }}</td>
          </tr>
          <tr>
            <th>Graffitier</th>
            <td v-if="unknownOwner">Unknown</td>
            <td v-else-if="!exists">None</td>
            <td v-else-if="selfOwned">You</td>
            <td v-else><AddressLink :address="owner" /></td>
          </tr>
          <tr>
            <th>Price</th>
            <td>{{ priceStr }}</td>
          </tr>
        </tbody>
      </table>

      <div>
        <button @click="onBuyClick" :disabled="!account || selfOwned">
          Buy
        </button>
      </div>
    </div>

    <div v-else>
      <p>Click on a pixel to select it.</p>
    </div>

    <BuyModal
      v-if="buyModalActive"
      :account="account"
      :price="price"
      :balance="balance"
      :taxBase="taxBase"
      :selectedPixel="selectedPixel"
      @close="buyModalActive = false"
    />
  </SidebarSection>
</template>

<script>
import { mapState } from "vuex";
import SidebarSection from "./SidebarSection.vue";
import AddressLink from "./AddressLink.vue";
import BuyModal from "./BuyModal.vue";
import { formatXDai, pixelCoordsToID, gWeiToWei } from "../utils.js";
import { gridSize } from "../config.js";
import { ethers } from "ethers";

export default {
  name: "PaintSidebarSection",
  props: ["selectedPixel", "balance", "taxBase"],

  components: {
    SidebarSection,
    AddressLink,
    BuyModal,
  },

  data() {
    return {
      owner: null,
      price: null,
      exists: null,
      buyModalActive: false,
      formatDAI(value) {
        if (!value) {
          return "Unknown";
        }
        return ethers.utils.formatEther(value) + " xDai";
      },
    };
  },

  computed: {
    pixelID() {
      return pixelCoordsToID(this.selectedPixel, gridSize[0]);
    },
    unknownOwner() {
      return this.exists === null || (this.exists && this.owner === null);
    },
    selfOwned() {
      return this.owner !== null && this.owner == this.account;
    },
    priceStr() {
      return formatXDai(this.price);
    },
    ...mapState(["account"]),
  },

  watch: {
    async selectedPixel(newPixel, oldPixel) {
      if (newPixel === null && oldPixel === null) {
        return;
      }
      if (
        oldPixel !== null &&
        newPixel !== null &&
        newPixel[0] == oldPixel[0] &&
        newPixel[1] == oldPixel[1]
      ) {
        return;
      }

      this.exists = null;
      this.price = null;
      this.owner = null;

      if (this.selectedPixel) {
        try {
          let priceGWei = await this.$contract.getPrice(this.pixelID);
          this.price = gWeiToWei(priceGWei);
          this.exists = await this.$contract.exists(this.pixelID);
          if (this.exists) {
            this.owner = await this.$contract.ownerOf(this.pixelID);
          } else {
            this.owner = null;
          }
        } catch (err) {
          this.exists = null;
          this.price = null;
          this.owner = null;
          // TODO: errors
          // this.$emit("error", "Failed to query pixel details: " + err.message);
        }
      }
    },
  },

  methods: {
    onBuyClick() {
      if (!this.account || this.selfOwned) {
        return;
      }
      this.buyModalActive = true;
    },
  },
};
</script>
