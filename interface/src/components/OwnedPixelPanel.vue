<template>
  <Panel title="Your Pixels">
    <div v-if="!pixels.length">
      <p>You don't seem to own any pixels.</p>
    </div>
    <div v-else>
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
    </div>
    <div v-if="selectedPixel">
      <table>
        <tbody>
          <tr>
            <th>Coordinates</th>
            <td>{{ coords[0] }}, {{ coords[1] }}</td>
          </tr>

          <tr>
            <th>Price</th>
            <td>{{ priceStr }}</td>
          </tr>

          <tr>
            <th>Color</th>
            <td>
              <v-swatches
                v-model="swatches[selectedPixel.color.toString()]"
                :swatches="swatches"
                show-border
                disabled
              ></v-swatches>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="selectedPixel">
      <form>
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
      </form>
    </div>
  </Panel>
</template>

<script>
import { ethers } from "ethers";
import { mapState } from "vuex";
import gql from "graphql-tag";
import {
  gWeiToWei,
  idToPixelCoords,
  pixelCoordsToID,
  colorsHex,
} from "../utils";
import { gridSize } from "../config";
import Panel from "./Panel.vue";
import ChangePriceField from "./ChangePrice.vue";
import ChangeColorField from "./ChangeColor.vue";
import VSwatches from "vue-swatches";

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
  name: "OwnedPixelPanel",
  props: ["account", "canvasSelectedPixel"],
  components: {
    Panel,
    ChangePriceField,
    ChangeColorField,
    VSwatches,
  },
  data() {
    return {
      pixels: [],
      selectedPixel: null,
      folded: false,
      swatches: colorsHex,
    };
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

  computed: {
    price() {
      if (!this.selectedPixel) {
        return null;
      }
      return gWeiToWei(ethers.BigNumber.from(this.selectedPixel.price));
    },
    priceStr() {
      if (!this.selectedPixel) {
        return "";
      }
      return ethers.utils.formatEther(this.price) + " xDai";
    },
    coords() {
      if (!this.selectedPixel) {
        return [-1, -1];
      }
      const idBig = ethers.BigNumber.from(this.selectedPixel.id);
      return idToPixelCoords(idBig, gridSize[0]);
    },
    ...mapState([
      "account",
    ]),
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
          this.$emit("error", "Failed to query pixel list: " + error.message);
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
