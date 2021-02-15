<template>
  <article class="panel is-outlined m-4">
    <div class="panel-heading">
      {{ title }}
      <chevron-up-icon
        v-if="!folded"
        class="is-pulled-right"
        size="1.5x"
        v-on:click="folded = true"
      ></chevron-up-icon>
      <chevron-down-icon
        v-if="folded"
        class="is-pulled-right"
        size="1.5x"
        v-on:click="folded = false"
      ></chevron-down-icon>
    </div>
    <slot v-if="!folded"></slot>
  </article>
</template>

<script>
import { ChevronUpIcon, ChevronDownIcon } from 'vue-feather-icons'

export default {
  name: "Panel",
  props: [
    "title",
  ],

  components: {
    ChevronUpIcon,
    ChevronDownIcon,
  },
  data() {
    return {
      folded: false,
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../assets/constants.scss';

.panel {
  pointer-events: auto;
  width: $panel-width;
}
</style>