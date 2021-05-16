import Vue from "vue";
import App from "./App.vue";
import { ethers } from "ethers";
import GraffitETH2Metadata from "./assets/GraffitETH2.json";
import { address } from "./config.js";
import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import "@/assets/main.scss";
import "vue-swatches/dist/vue-swatches.css";

Vue.config.productionTip = false;
import { store } from "./store.js";

// setup provider and contract instance if available
if (window.ethereum) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(
    address,
    GraffitETH2Metadata.abi,
    provider
  );

  Vue.prototype.$provider = provider;
  Vue.prototype.$contract = contract;
} else {
  Vue.prototype.$provider = null;
  Vue.prototype.$contract = null;
}

// setup apollo client connected to subgraph
const apolloClient = new ApolloClient({
  uri: "https://api.thegraph.com/subgraphs/name/jannikluhn/graffiteth",
  cache: new InMemoryCache(),
});
Vue.prototype.$apolloClient = apolloClient;

new Vue({
  render: h => h(App),
  store: store,
}).$mount("#app");
