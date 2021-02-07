import { Bytes } from "@graphprotocol/graph-ts"
import {
  ColorChange,
} from "../generated/Graffiti/Graffiti"
import { Graffiti } from "../generated/schema"

export function handleColorChange(event: ColorChange): void {
  let graffiti = Graffiti.load("")
  if (graffiti == null) {
    graffiti = new Graffiti("");
    graffiti.pixels = new Bytes(333 * 333);
  }
  let index = event.params.pixelID.toI32()
  graffiti.pixels.fill(event.params.color, index, index + 1);
  graffiti.save();
}
