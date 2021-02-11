<template>
  <div class="modal is-active">
    <div class="modal-background"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">About</p>
        </header>

        <section class="modal-card-body">

          <div>
            <label class="label">
              What it is
            </label>
            <p>
              GraffitETH is the Ethereum graffiti wall. It’s an experiment in market socialism, a collaborative artwork, and a window into Ethereum for the world.
            </p>
          </div>

          <div>
            <label class="label">
              How it works
            </label>
            <p>
              GraffitETH is a digital graffiti wall in which pixels are NFTs (non-fungible tokens, a type of digital property) subject to the Harberger tax. What that means: You can paint a pixel by buying the NFT, but anyone else can buy it from you immediately and paint over it. To prevent other people from painting over your pixel, you must set a high price... But you can’t set it too high, since you will have to pay pixel taxes on it!
            </p>
            <p>
              Anyone can participate and paint the wall. To get started, you’ll need to set up a web3 Ethereum wallet (for managing your crypto assets and interacting with the GraffitETH smart contract) and load it with xDAI (the cryptocurrency used for buying and paying taxes on the pixels, and for paying transaction fees on the xDai blockchain).
            </p>
          </div>

          <div>
            <label class="label">
              What do you do with the money?
            </label>
            <p>
              A DAO (Decentralized Autonomous Organization, like a board of directors) will use the money raised through pixel taxes to display the evolving artwork over time (on billboards, online ads, etc.). Perhaps someday your pixels will appear on a billboard in Times Square, ETHDenver t-shirts, or even a flag on the moon...
            </p>
          </div>

          <div>
            <label class="label">
              Why the Harberger tax?
            </label>
            <p>
              The Harberger tax is a market tool theorized to encourage fair property prices, and thus ensure that everyone pays an appropriate amount of taxes. You could consider it a compromise between public and private property ownership. It’s not a new idea, but it has never been put into practice on a large scale.
            </p>
            <p>
              Using the Harberger tax in this project should show us the fair price of space on the graffiti wall, pixel by pixel. Watching the wall evolve will help us better understand how people interact with property (like pixel NFTs) under these unusual market conditions.
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
              Acknowledgements
            </label>
            <p>
              GraffitETH was created as part of the ETHDenver Buildathon. Inspiration for the concept of a digital graffiti wall can be traced back to The Million Dollar Homepage in 2005 (https://en.wikipedia.org/wiki/The_Million_Dollar_Homepage). Another influential project after that was Reddit’s Place in 2017 (https://en.wikipedia.org/wiki/Place_(Reddit)). More recently was Satoshi’s Place in 2020 (https://satoshis.place/), which was set up so pixels could be purchased using Bitcoin’s lightning network. Credit to Simon de la Rouviere for mentioning this stuff in an article about Harberger taxes and blockchain a couple years ago (https://medium.com/@simondlr/what-is-harberger-tax-where-does-the-blockchain-fit-in-1329046922c6) that probably planted the seed for this project in our subconscious brains. Thanks also to the RadicalxChange project for providing great resources related to the Harberger tax (https://www.radicalxchange.org/concepts/partial-common-ownership/).
            </p>
          </div>

        </section>

        <footer class="modal-card-foot">
          <p>***ms F was here***</p>
        </footer>
    </div>
  </div>
</template>

<script>
export default {
  name: "AboutModal",
}
</script>