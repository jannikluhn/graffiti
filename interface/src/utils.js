function intToNatural(n) {
    if (n >= 0) {
      return 2 * n
    } else {
      return -2 * n - 1
    }
  }
  
  function pixelCoordsToID(coords) {
    let n1 = intToNatural(coords[0])
    let n2 = intToNatural(coords[1])
    let paired = (n1 + n2) * (n1 + n2 + 1) / 2 + n2
    return paired
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
    weiToGWei,
    gWeiToWei,
    weiToEth,
  }