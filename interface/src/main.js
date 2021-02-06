import Vue from 'vue'
import App from './App.vue'
import { ethers } from 'ethers'
import GraffitiMetadata from './assets/Graffiti.json'
import { ApolloClient, InMemoryCache } from '@apollo/client/core'

import '@/assets/main.scss'

if (window.ethereum) {
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const address = '0xe867743154dbF864544c6D69B31D3cfb997E2ee6'
  const contract = new ethers.Contract(address, GraffitiMetadata.abi, provider)
  // todo: check we're on the right network

  Vue.prototype.$provider = provider
  Vue.prototype.$contract = contract
} else {
  Vue.prototype.$provider = null
  Vue.prototype.$graffitiContract = null
}

const apolloClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/jannikluhn/graffiti-goerli',
  cache: new InMemoryCache(),
})
Vue.prototype.$apolloClient = apolloClient

Vue.config.productionTip = false

new Vue({
  render: h => h(App)
}).$mount('#app')
