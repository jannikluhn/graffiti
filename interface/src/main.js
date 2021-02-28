import Vue from 'vue'
import App from './App.vue'
import { ethers } from 'ethers'
import GraffitETHMetadata from './assets/GraffitETH.json'
import GraffitETH2Metadata from './assets/GraffitETH2.json'
import { addressV1, addressV2 } from './config.js'
import { ApolloClient, InMemoryCache } from '@apollo/client/core'
import '@/assets/main.scss'
import 'vue-swatches/dist/vue-swatches.css'


if (window.ethereum) {
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const contractV1 = new ethers.Contract(addressV1, GraffitETHMetadata.abi, provider)
  const contract = new ethers.Contract(addressV2, GraffitETH2Metadata.abi, provider)

  Vue.prototype.$provider = provider
  Vue.prototype.$contractV1 = contractV1
  Vue.prototype.$contract = contract
} else {
  Vue.prototype.$provider = null
  Vue.prototype.$contractV1 = null
  Vue.prototype.$contract = null
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
