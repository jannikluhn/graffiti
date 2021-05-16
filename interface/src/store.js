import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

export const store = new Vuex.Store({
  strict: process.env.NODE_ENV !== "production",

  state: {
    account: null,
    chainID: null,
  },

  mutations: {
    changeAccount(state, account) {
      state.account = account;
    },
    changeChain(state, chainID) {
      state.chainID = chainID;
    },
  },
});
