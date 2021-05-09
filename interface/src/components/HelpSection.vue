<template>
  <SidebarSection>
    <div>
      <button @click="aboutModalActive = true">About</button>
    </div>
    <div>
      <button @click="howtoModalActive = true">How-To</button>
    </div>
    <div>
      DISCLAIMER: GraffitETH is unaudited. We think it's safe, but who the hell
      knows.
    </div>

    <Modal
      v-if="aboutModalActive"
      title="About"
      @close="aboutModalActive = false"
    />
    <Modal
      v-else-if="howtoModalActive"
      title="How-To"
      @close="howtoModalActive = false"
    />
  </SidebarSection>
</template>

<script>
import SidebarSection from "./SidebarSection.vue";
import Modal from "./Modal.vue";

export default {
  name: "HelpSection",

  components: {
    SidebarSection,
    Modal,
  },

  data() {
    return {
      aboutModalActive: false,
      howtoModalActive: false,
    };
  },
};
</script>
