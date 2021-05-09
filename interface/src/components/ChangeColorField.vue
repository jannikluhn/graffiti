<template>
  <div>
    <div>
      <div>
        <div>
          <v-swatches
            v-model="colorHex"
            :swatches="swatches"
            show-border
            popover-y="top"
          ></v-swatches>
        </div>
      </div>
    </div>
    <div>
      <button
        :class="{ 'is-loading': waitingForTx }"
        @click="changeColor"
        :disabled="!colorChanged"
      >
        Change Color
      </button>
    </div>
  </div>
</template>

<script>
import VSwatches from "vue-swatches";
import { colorHexIndices, colorsHex } from "../utils";

export default {
  name: "ChangeColorField",
  components: {
    VSwatches,
  },

  props: ["account", "pixelID", "currentColor"],

  data() {
    return {
      waitingForTx: false,
      colorHex: "#ffffff",
      swatches: colorsHex,
    };
  },

  watch: {
    currentColor: {
      handler() {
        this.colorHex = this.swatches[this.currentColor];
      },
      immediate: true,
    },
  },

  computed: {
    colorChanged() {
      return colorHexIndices[this.colorHex] != this.currentColor;
    },
  },

  methods: {
    async changeColor() {
      if (!this.colorChanged) {
        return;
      }

      this.waitingForTx = true;
      try {
        let signer = this.$provider.getSigner(this.account);
        let contract = this.$contract.connect(signer);
        await contract.edit(
          this.account,
          [],
          [[this.pixelID, colorHexIndices[this.colorHex]]],
          []
        );
      } catch (err) {
        this.$emit(
          "error",
          "Failed to send change color transaction: " + err.message
        );
      }
      this.waitingForTx = false;
    },
  },
};
</script>
