<template>
  <div>
    <AccountSidebarSection />
    <PaintSidebarSection />
  </div>
</template>

<script>
import AccountSidebarSection from "./AccountSidebarSection.vue";
import PaintSidebarSection from "./PaintSidebarSection.vue";

export default {
  name: "Sidebar",

  components: {
    AccountSidebarSection,
    PaintSidebarSection,
  }
}
</script>