<template>
  <SidebarSection title="Account">
    <button @click="modalActive = true">Show Modal</button>
    <Modal title="Modal" :active="modalActive" @close="modalActive = false">
      <p>Modal body</p>
    </Modal>
  </SidebarSection>
</template>

<script>
import SidebarSection from "./SidebarSection.vue";
import Modal from "./Modal.vue";

export default {
  name: "AccountSidebarSection",

  data() {
    return {
      modalActive: false,
    };
  },

  components: {
    SidebarSection,
    Modal,
  },
};
</script>
