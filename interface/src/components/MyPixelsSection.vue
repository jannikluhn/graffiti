<template>
  <SidebarSection title="My Pixels">
    <div>
      <select @change="onChange">
        <option
          v-for="pixel in pixels"
          :key="pixel.id"
          :value="pixel.id"
          :selected="selectedPixel && pixel.id == selectedPixel.id"
        >
          {{ hexToIntStr(pixel.id) }}
        </option>
      </select>
    </div>
    <div v-if="selectedPixel">
      <ChangeColorField
        :account="account"
        :pixelID="selectedPixel.id"
        :currentColor="selectedPixel.color"
        @error="msg => $emit('error', msg)"
      />
      <ChangePriceField
        :account="account"
        :pixelID="selectedPixel.id"
        @error="msg => $emit('error', msg)"
      />
    </div>
  </SidebarSection>
</template>

<script>
import SidebarSection from "./SidebarSection.vue";
import ChangeColorField from "./ChangeColorField.vue";
import ChangePriceField from "./ChangePriceField.vue";
import {
  pixelCoordsToID,
  gWeiToWei,
  formatXDai,
  idToPixelCoords,
} from "../utils.js";
import { gridSize } from "../config.js";
import { ethers } from "ethers";
import gql from "graphql-tag";

const pixelQuery = gql`
  query pixelsOf($address: Bytes, $lastID: String) {
    pixels(first: 100, where: { owner: $address, id_gt: $lastID }) {
      id
      price
      color
    }
  }
`;

export default {
  name: "MyPixelsSection",
  props: ["account", "canvasSelectedPixel"],

  components: {
    SidebarSection,
    ChangeColorField,
    ChangePriceField,
  },
  data() {
    return {
      pixels: [],
      selectedPixel: null,
    };
  },

  computed: {
    price() {
      if (!this.selectedPixel) {
        return null;
      }
      return gWeiToWei(ethers.BigNumber.from(this.selectedPixel.price));
    },
    priceStr() {
      return formatXDai(this.price);
    },
    coords() {
      if (!this.selectedPixel) {
        return [-1, -1];
      }
      const idBig = ethers.BigNumber.from(this.selectedPixel.id);
      return idToPixelCoords(idBig, gridSize[0]);
    },
  },

  watch: {
    account: {
      handler: function(newAddress, oldAddress) {
        if (newAddress == oldAddress) {
          return;
        }
        if (newAddress === null) {
          this.pixels = [];
          this.selectedPixel = null;
          return;
        }
        this.queryPixels();
      },
      immediate: true,
    },
    canvasSelectedPixel() {
      // If the user selects a pixel they own by clicking on it, show it in this panel.
      if (!this.canvasSelectedPixel) {
        return;
      }

      const id = pixelCoordsToID(this.canvasSelectedPixel, gridSize[0]);
      for (let p of this.pixels) {
        const pIdBig = ethers.BigNumber.from(p.id);
        if (pIdBig.eq(id)) {
          this.selectedPixel = p;
          return;
        }
      }
    },
  },

  methods: {
    async queryPixels() {
      this.pixels = [];
      this.selectedPixel = null;
      let lastID = "";
      for (;;) {
        try {
          let queryResult = await this.$apolloClient.query({
            query: pixelQuery,
            variables: {
              address: this.account,
              lastID: lastID,
            },
          });
          let pixels = queryResult.data.pixels;
          if (pixels.length == 0) {
            if (this.pixels.length > 0) {
              this.selectedPixel = this.pixels[0];
            }
            return;
          }
          this.pixels.push(...pixels);
          lastID = pixels[pixels.length - 1].id;
        } catch (error) {
          this.pixels = [];
          // TODO: errors
          // this.$emit("error", "Failed to query pixel list: " + error.message);
          return;
        }
      }
    },

    onChange(event) {
      const id = event.target.value;
      for (let pixel of this.pixels) {
        if (pixel.id == id) {
          this.selectedPixel = pixel;
          return;
        }
      }
    },

    hexToIntStr(n) {
      return ethers.BigNumber.from(n).toString();
    },
  },
};
</script>
