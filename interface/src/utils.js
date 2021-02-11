const colorsHexAndRGBA = [
  ['#ffffff', [255, 255, 255, 255]],
  ['#e4e4e4', [228, 228, 228, 255]],
  ['#888888', [136, 136, 136, 255]],
  ['#222222', [34, 34, 34, 255]],
  ['#ffa7d1', [255, 167, 209, 255]],
  ['#e50000', [229, 0, 0, 255]],
  ['#e59500', [229, 149, 0, 255]],
  ['#a06a42', [160, 106, 66, 255]],
  ['#e5d900', [229, 217, 0, 255]],
  ['#94e044', [148, 224, 68, 255]],
  ['#02be01', [2, 190, 1, 255]],
  ['#00d3dd', [0, 211, 221, 255]],
  ['#0083c7', [0, 131, 199, 255]],
  ['#0000ea', [0, 0, 234, 255]],
  ['#cf6ee4', [207, 110, 228, 255]],
  ['#820080', [130, 0, 128, 255]],
]
let colorsHex = [];
let colorsRGBA = [];
let colorHexIndices = {};
for (let [i, [hex, rgba]] of colorsHexAndRGBA.entries()) {
  colorsHex.push(hex)
  colorsRGBA.push(rgba)
  colorHexIndices[hex] = i
}

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
    const address1 = address.substring(0, 6)
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
  colorsHex,
  colorsRGBA,
  colorHexIndices,
}