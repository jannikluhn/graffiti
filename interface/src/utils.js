function pixelCoordsToID(coords, width) {
  return coords[0] + coords[1] * width
}

function idToPixelCoords(id, width) {
  const x = id % width
  const y = Math.floor(id / width)
  const coords = [x, y]
  console.assert(pixelCoordsToID(coords, width) == id)
  return coords
}

function shortenAddress(address) {
    const address1 = address.substring(1, 6)
    const address2 = address.substring(38)
    return address1.concat('…', address2)
}

function weiToGWei(wei) {
  return wei.div(1000000000)
}

function gWeiToWei(gwei) {
  return gwei.mul(1000000000)
}

function weiToEth(wei) {
  return wei.div("1000000000000000000")
}

export {
  pixelCoordsToID,
  idToPixelCoords,
  weiToGWei,
  gWeiToWei,
  weiToEth,
  shortenAddress,
}
