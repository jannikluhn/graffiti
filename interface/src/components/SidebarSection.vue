<template>
  <section>
    <h1 v-if="title">{{ title }}</h1>
    <slot></slot>
  </section>
</template>

<script>
export default {
  name: "SidebarSection",
  props: ["title"],
};
</script>
