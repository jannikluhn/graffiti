<template>
  <div v-if="active" @click="onBackgroundClick" class="modal">
    <div @click="onBodyClick" class="modal-body">
      <h1>{{ title }}</h1>
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: "Modal",
  props: ["active", "title"],

  methods: {
    onBackgroundClick() {
      this.$emit("close");
    },
    onBodyClick(event) {
      event.stopPropagation();
    },
  },
};
</script>

<style lang="scss">
@import "../assets/main.scss";

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background-color: $modal-background-color;
}

.modal-body {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  -ms-transform: translate(-50%, -50%);
}
</style>
