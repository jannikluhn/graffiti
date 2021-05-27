<template>
  <SidebarSection>
    <div>
      <button @click="aboutModalActive = true">About</button>
    </div>
    <div>
      <button @click="howtoModalActive = true">How-To</button>
    </div>
    <div id="disclaimer" class="small-text">
      DISCLAIMER: GraffitETH is unaudited. We think it's safe, but who the hell
      knows.
    </div>

    <AboutModal
      v-if="aboutModalActive"
      title="About"
      @close="aboutModalActive = false"
      class="info-modal"
    />
    <AboutModal
      v-else-if="howtoModalActive"
      title="How-To"
      @close="howtoModalActive = false"
      class="info-modal"
    />
  </SidebarSection>
</template>

<script>
import SidebarSection from "./SidebarSection.vue";
import AboutModal from "./AboutModal";

export default {
  name: "HelpSection",

  components: {
    SidebarSection,
    AboutModal
  },

  data() {
    return {
      aboutModalActive: false,
      howtoModalActive: false,
    };
  },
};
</script>
