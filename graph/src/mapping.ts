import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  GraffitETH2,
  Bought,
  ColorChanged,
  PriceChanged,
  Earmarked,
  PixelClaimed,
  Deposited,
  Withdrawn,
} from "../generated/GraffitETH2/GraffitETH2"
import { Graffiti, Pixel, Account } from "../generated/schema"
import { log, Address } from '@graphprotocol/graph-ts'

function updateAccount(accountAddress: Address, contractAddress: Address): void {
  let account = Account.load(accountAddress.toHex());
  if (account == null) {
    log.info("creating account {}", [accountAddress.toHex()]);
    account = new Account(accountAddress.toHex());
  }

  let contract = GraffitETH2.bind(contractAddress);
  account.recordedBalance = contract.getRecordedBalance(accountAddress);
  account.lastTaxPayment = contract.getLastTaxPayment(accountAddress).toI32();
  account.taxBase = contract.getTaxBase(accountAddress);
  account.save();
}

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

  updateAccount(event.params.buyer, event.address);
  updateAccount(event.params.seller, event.address);
}

export function handlePriceChanged(event: PriceChanged): void {
  log.debug("price changed {}", [event.params.pixelID.toHex()]);
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

  updateAccount(event.params.owner, event.address);
}

export function handleEarmarked(event: Earmarked): void {
  log.debug("earmarked {}", [event.params.pixelID.toHex()]);
  let pixel = Pixel.load(event.params.pixelID.toHex())
  pixel.earmarkedReceiver = event.params.receiver;
  pixel.save();
}

export function handlePixelClaimed(event: PixelClaimed): void {
  log.debug("pixel claimed {}", [event.params.pixelID.toHex()]);
  let pixel = Pixel.load(event.params.pixelID.toHex());
  pixel.owner = pixel.earmarkedReceiver;
  pixel.save();

  updateAccount(event.params.oldOwner, event.address);
  updateAccount(event.params.newOwner, event.address);
}

export function handleDeposited(event: Deposited): void {
  updateAccount(event.params.account, event.address);
}

export function handleWithdrawn(event: Withdrawn): void {
  updateAccount(event.params.account, event.address);
}