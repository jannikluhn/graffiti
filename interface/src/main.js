import Vue from 'vue'
import App from './App.vue'
import { ethers } from 'ethers'
import GraffitETHMetadata from './assets/GraffitETH.json'
import { ApolloClient, InMemoryCache } from '@apollo/client/core'
import '@/assets/main.scss'
import 'vue-swatches/dist/vue-swatches.css'


if (window.ethereum) {
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const address = '0xc56F6037596116875ABEa6845f60dA88088F06Ea'
  const contract = new ethers.Contract(address, GraffitETHMetadata.abi, provider)
  // todo: check we're on the right network

  Vue.prototype.$provider = provider
  Vue.prototype.$contract = contract
} else {
  Vue.prototype.$provider = null
  Vue.prototype.$graffitiContract = null
}

const apolloClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/jannikluhn/graffiteth',
  cache: new InMemoryCache(),
})
Vue.prototype.$apolloClient = apolloClient

Vue.config.productionTip = false

new Vue({
  render: h => h(App)
}).$mount('#app')
