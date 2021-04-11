import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  Bought,
  ColorChanged,
  PriceChanged,
  Earmarked,
  PixelClaimed,
} from "../generated/GraffitETH2/GraffitETH2"
import { Graffiti, Pixel } from "../generated/schema"
import { log } from '@graphprotocol/graph-ts'

export function handleColorChanged(event: ColorChanged): void {
  log.debug("color changed {}", [event.params.pixelID.toHex()]);
  let graffiti = Graffiti.load("")
  if (graffiti == null) {
    log.info("initializing graffiti", []);
    graffiti = new Graffiti("");
    graffiti.pixels = new Bytes(151 * 151);
  }

  let index = event.params.pixelID.toI32()
  graffiti.pixels.fill(event.params.color, index, index + 1);
  graffiti.save();

  let pixel = Pixel.load(event.params.pixelID.toHex());
  pixel.color = event.params.color;
  pixel.save();
}

export function handleBought(event: Bought): void {
  log.debug("buy {}", [event.params.pixelID.toHex()]);
  let id = event.params.pixelID.toHex()
  let pixel = Pixel.load(id);
  if (pixel == null) {
    pixel = new Pixel(id);
    // color and price will be set in color and price change events immediately following the buy
    // event
    pixel.price = new BigInt(0);
    pixel.color = 0;
  }
  pixel.owner = event.params.buyer;
  pixel.earmarkedReceiver = new Bytes(20);
  pixel.save()
}

export function handlePriceChanged(event: PriceChanged): void {
  let id = event.params.pixelID.toHex()
  let pixel = Pixel.load(id);
  if (pixel == null) {
    // pixels created during initialization begin their life with a price changed event
    pixel = new Pixel(id);
    pixel.owner = event.params.owner;
    pixel.color = 0;
    pixel.earmarkedReceiver = new Bytes(20);
  }
  pixel.price = event.params.price;
  pixel.save();
}

export function handleEarmarkUpdate(event: Earmarked): void {
  let pixel = Pixel.load(event.params.pixelID.toHex())
  pixel.earmarkedReceiver = event.params.receiver;
  pixel.save();
}

export function handleClaim(event: PixelClaimed): void {
  let pixel = Pixel.load(event.params.pixelID.toHex());
  pixel.owner = pixel.earmarkedReceiver;
  pixel.save();
}