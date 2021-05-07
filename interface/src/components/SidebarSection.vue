<template>
  <section>
    <h1>{{ title }}</h1>
    <slot></slot>
  </section>
</template>

<script>
export default {
  name: "SidebarSection",
  props: ["title"],
};
</script>
