<template>
  <div class="modal" v-bind:class="{'is-active': active}">
    <div class="modal-background"></div>
      <div class="modal-card info">
        <header class="modal-card-head">
          <!-- <p class="modal-card-title">About</p> -->
          <button class="delete is-pulled-right" aria-label="close" v-on:click="close()"></button>
        </header>
        <section class="modal-card-body">
          <div class="img">
            <img src="../assets/logoRainbow.svg" width="387px" alt="GraffitETH">
          </div>
          <div class="tabs is-centered is-small">
            <ul>
              <li v-bind:class="{'is-active': selectedTab==0}" v-on:click="selectedTab=0"><a><strong>About</strong></a></li>
              <li v-bind:class="{'is-active': selectedTab==1}" v-on:click="selectedTab=1"><a><strong>How to</strong></a></li>
            </ul>
          </div>
          <div class="pb-4" v-if="selectedTab==0">
            <div>
              <label class="label">
                What it is
              </label>
              <p>
                 GraffitETH is the Ethereum graffiti wall, based on the Harberger tax. It’s an experiment in market socialism, a collaborative artwork, and a window into Ethereum for the world. Created by <a href="https://twitter.com/aleezagroks">Aleeza Howitt</a>, <a href="https://github.com/jannikluhn">Jannik Luhn</a>, and <a href="http://marianono.superhi.com/">Maria Nogueira</a>.
              </p>
            </div>

          <div>
            <label class="label">
              How it works
            </label>
            <p class="mb-2">
              GraffitETH is a digital graffiti wall in which pixels are NFTs (non-fungible tokens, a type of digital property) subject to the Harberger tax.
            </p>
            <p class="mb-2">
              What that means: You can paint a pixel by buying the NFT, but anyone else can buy it from you immediately and paint over it. To prevent other people from painting over your pixel, you must set a high price... But you can’t set it too high, since you will have to pay pixel taxes on it!
            </p>
            <p class="mb-2">
              Anyone can participate and paint the wall. To get started, you’ll need to set up a web3 Ethereum wallet (for managing your crypto assets and interacting with the GraffitETH smart contract) and load it with xDAI (the cryptocurrency used for buying and paying taxes on the pixels, and for paying transaction fees on the xDai blockchain). Check out the How to guide for details.
            </p>
          </div>

          <div>
            <label class="label">
              What do you do with the money?
            </label>
            <p>
              A <a href="https://www.dd.ie/2016/04/the-decentralized-autonomous.html">DAO (Decentralized Autonomous Organization)</a> will use the money raised through pixel taxes to display the evolving artwork over time (on billboards, online ads, etc.). Perhaps someday your pixels will appear on a billboard in Times Square, ETHDenver t-shirts, or even a flag on the moon...
            </p>
          </div>

          <div>
            <label class="label">
              Why the Harberger tax?
            </label>
            <p class="mb-2">
              The Harberger tax is a market tool theorized to encourage fair property prices, and thus ensure that everyone pays an appropriate amount of taxes. You could consider it a compromise between public and private property ownership. It’s not a new idea, but it has never been put into practice on a large scale.
            </p>
            <p>
              Using the Harberger tax in this project should show us the fair price of space on the graffiti wall, pixel by pixel. Watching the wall evolve will help us better understand how people interact with property (like pixel NFTs) under these unusual market conditions.
            </p>
          </div>

          <div>
            <label class="label">
              Why are pixel taxes 1% per month?
            </label>
            <p class="mb-2">
              The Common Ownership Self-Assessed Tax (COST) plan as described in the book <a href="https://assets.press.princeton.edu/chapters/s11222.pdf">Radical Markets by E. Glen Weyl and Eric A. Posner</a> suggests a tax rate of 7% per year: “Because tax rates would, ideally, be adapted to assets based on turnover rates, some assets unlikely to turn over often (family heirlooms and photographs, diaries) would be taxed at very low rates, while others (such as trendy gadgets) would be taxed at high rates. When tax rates are very low, the possessor can prevent others from taking an item by paying a small tax. For typical assets, we estimate that turnover once every fourteen years is reasonable and thus (combined with other factors below) a 7% tax annually is a good target.” (p. 64-65)
            </p>
            <p>
              We rounded up to 12% per year (1% per month) because we think pixels are trendy gadgets that should have a higher turnover... And also because the math is easier.
            </p>
          </div>

          <div>
            <label class="label">
             Why blockchain?
            </label>
            <p>
              Ethereum is an excellent environment to test innovative market tools like the Harberger tax, that would otherwise disappear under logistical roadblocks or political inertia. With Ethereum, property can be cheaply and securely transferred from person to person, taxes can be paid automatically, and the funds that are raised can be managed in a transparent, secure, and democratic way.
            </p>
          </div>

            <div>
              <label class="label">
                Why xDai?
              </label>
              <p>
                GraffitETH is an open-source project deployed on xDai, an Ethereum sidechain. We chose to use xDai because it is cheaper and faster than the Ethereum mainchain, but it is still compatible with other essential integrations like The Graph. In addition, xDai transaction fees are denominated in a “stablecoin” pegged to the US Dollar, making it simpler to interact with.
              </p>
            </div>


          <div>
            <label class="label">
              Nerdy stuff
            </label>
            <p>
              Contract address: <a href="https://blockscout.com/poa/xdai/address/0xA70e070C350F97200CA28F9FBe0Dc85c2c8ca79E/transactions">0xA70e070C350F97200CA28F9FBe0Dc85c2c8ca79E"</a>
            </p>
            <p>
              Source code: <a href="https://github.com/jannikluhn/graffiti">https://github.com/jannikluhn/graffiti</a>
            </p>
            <p>
              Subgraph: <a href="https://thegraph.com/explorer/subgraph/jannikluhn/graffiteth">GraffitETH</a>
            </p>
          </div>

          <div>
            <label class="label">
              Acknowledgements
            </label>
            <p>
              GraffitETH was created as part of the ETHDenver Buildathon. Inspiration for the concept of a digital graffiti wall can be traced back to <a href="https://en.wikipedia.org/wiki/The_Million_Dollar_Homepage">The Million Dollar Homepage</a> in 2005. Another influential project after that was 
              <a href="https://en.wikipedia.org/wiki/Place_(Reddit)">Reddit’s Place</a> in 2017. More recently was <a href="https://satoshis.place/">Satoshi’s Place</a> in 2020, which was set up so pixels could be purchased using Bitcoin’s lightning network. Credit to Simon de la Rouviere for <a href="https://medium.com/@simondlr/what-is-harberger-tax-where-does-the-blockchain-fit-in-1329046922c6">mentioning this stuff</a> in an article about Harberger taxes and blockchain a couple years ago that probably planted the seed for this project in our subconscious brains. Thanks also to the RadicalxChange project for providing <a href="https://www.radicalxchange.org/concepts/partial-common-ownership/">great resources</a> related to the Harberger tax.
            </p>
          </div>
            
          </div>
          <div class="pb-4" v-if="selectedTab==1">
            <div>
              <label class="label">
              Web3 Setup
              </label>
              <ol>
                <li>Download <a href="httols://metamask.io/">Metamask</a> or another web3 wallet.</li>
                <li>Load your wallet with xDai. You can do this by buying it directly from <a href="https://ramp.network/">The Ramp</a>. See <a href="https://honeyswap.org/xdai-ramp">this article</a> for instructions.<br>Advanced: If you have DAI already, you can convert it to xDai with the <a href="https://bridge.xdaichain.com/">xDai Bridge</a>.</li>
                <li>Connect Metamask to the xDai network. See <a href="https://www.xdaichain.com/for-users/wallets/metamask/metamask-setup">this article</a> for instructions.</li>
                <li>Click “connect wallet” in the Wallet Connection panel. Metamask will ask you to confirm. Congrats, now you can interact with the GraffitETH dapp!</li>
              </ol>
            </div>
            <div>
              <label class="label">
                Paint a Pixel
              </label>
              <ol>
                <li>Click on any pixel to select it.</li>
                <li>There is a panel called <strong>Create Graffiti</strong>. Click <strong>Buy</strong>.</li>
                <li>Pick a new color to paint your pixel.</li>
                <li>Set a price for your pixel. You will pay 1% per month on this price for as long as you own it. Remember, anyone can buy it from you at this price and paint over it!</li>
                <li>Choose how much xDai to add to your deposit. You need to have enough money in your balance to pay for the pixel, as well as to pay pixel taxes on it. If your deposit is already high enough, you don’t have to deposit more. <em>If your balance goes to zero, anyone will be able to buy and paint your pixels for free.</em></li>
                <li>Click <strong>Buy</strong>.</li>
                <li>Metamask will ask you to confirm.</li>
                <li>Congrats, you have graffitied GraffitETH! 🎉 </li>
              </ol>
            </div>
            <div>
              <label class="label">
                GraffitETH DAO
              </label>
              <ol>
                <li>The funds raised from pixel taxes will go towards displaying our collaborative artwork in dope places.</li>
                <li>All pixel taxpayers will be invited to participate in governance of the GraffitETH DAO, to help decide where GraffitETH is displayed.</li>
                <li>Follow our Twitter account <a href="https://twitter.com/@graffiteth">@graffiteth</a> for updates!</li>
              </ol>
            </div>
          </div>
        </section>
    </div>
  </div>
</template>

<script>
export default {
  name: "AboutModal",
  props: ["active"],
  methods: {
    close() {
      this.$emit('close')
    }
  },
  data() {
    return {
      selectedTab: 0
    }
  }
}
</script>