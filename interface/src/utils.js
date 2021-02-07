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
    return address1.concat('…', address2).toLowerCase()
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

function byteToColor(b) {
  let rgb = undefined
  switch (b) {
    case 0:
      rgb = [255, 255, 255, 255]
      break
    case 1:
      rgb = [228, 228, 228, 255]
      break
    case 2:
      rgb = [136, 136, 136, 255]
      break
    case 3:
      rgb = [34, 34, 34, 255]
      break
    case 4:
      rgb = [255, 167, 209, 255]
      break
    case 5:
      rgb = [229, 0, 0, 255]
      break
    case 6:
      rgb = [229, 149, 0, 255]
      break
    case 7:
      rgb = [160, 106, 66, 255]
      break
    case 8:
      rgb = [229, 217, 0, 255]
      break
    case 9:
      rgb = [148, 224, 68, 255]
      break
    case 10:
      rgb = [2, 190, 1, 255]
      break
    case 11:
      rgb = [0, 211, 221, 255]
      break
    case 12:
      rgb = [0, 131, 199, 255]
      break
    case 13:
      rgb = [0, 0, 234, 255]
      break
    case 14:
      rgb = [207, 110, 228, 255]
      break
    case 15:
      rgb = [130, 0, 128, 255]
      break
    default:
      rgb = [255, 255, 255, 255]
  }
  return rgb
}

export {
  pixelCoordsToID,
  idToPixelCoords,
  weiToGWei,
  gWeiToWei,
  weiToEth,
  shortenAddress,
  byteToColor,
}
