<template>
  <div>
    <AccountSidebarSection />
    <PaintSidebarSection />
    <MyPixelsSection />
    <HelpSection />
  </div>
</template>

<script>
import AccountSidebarSection from "./AccountSidebarSection.vue";
import PaintSidebarSection from "./PaintSidebarSection.vue";
import MyPixelsSection from "./MyPixelsSection.vue";
import HelpSection from "./HelpSection.vue";

export default {
  name: "Sidebar",

  components: {
    AccountSidebarSection,
    PaintSidebarSection,
    MyPixelsSection,
    HelpSection,
  },
};
</script>
