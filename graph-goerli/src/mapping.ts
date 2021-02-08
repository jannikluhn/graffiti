import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  Buy,
  ColorChange,
  PriceChange,
  EarmarkUpdate,
  PixelClaim,
} from "../generated/Graffiti/Graffiti"
import { Graffiti, Pixel } from "../generated/schema"
import { log } from '@graphprotocol/graph-ts'

export function handleColorChange(event: ColorChange): void {
  let graffiti = Graffiti.load("")
  if (graffiti == null) {
    log.info("initializing graffiti", []);
    graffiti = new Graffiti("");
    graffiti.pixels = new Bytes(333 * 333);
  }

  let index = event.params.pixelID.toI32()
  graffiti.pixels.fill(event.params.color, index, index + 1);
  graffiti.save();

  let pixel = Pixel.load(event.params.pixelID.toHex())
  pixel.color = event.params.color;
  pixel.save();
}

export function handleBuy(event: Buy): void {
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

export function handlePriceChange(event: PriceChange): void {
  let pixel = Pixel.load(event.params.pixelID.toHex())
  pixel.price = event.params.price;
  pixel.save();
}

export function handleEarmarkUpdate(event: EarmarkUpdate): void {
  let pixel = Pixel.load(event.params.pixelID.toHex())
  pixel.earmarkedReceiver = event.params.receiver;
  pixel.save();
}

export function handleClaim(event: PixelClaim): void {
  let pixel = Pixel.load(event.params.pixelID.toHex());
  pixel.owner = pixel.earmarkedReceiver;
  pixel.save();
}