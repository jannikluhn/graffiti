<template>
  <div @click="onBackgroundClick" class="modal">
    <div @click="onBodyClick" class="modal-body">
      <header class="header-type">{{ title }}</header>
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: "Modal",
  props: ["title"],

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
  padding-bottom: 15px;
  transform: translate(-50%, -50%);
  -ms-transform: translate(-50%, -50%);
  background: $ui-background-color;
  width: 35vw;
  header {
    background: $rainbow-gradient;
    font-size: 21px;
    color: #FFF;
    padding: 30px 0;
    margin-bottom: 45px;
  }
}
</style>
