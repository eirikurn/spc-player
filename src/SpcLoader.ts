/**
 * Based on this: http://snesmusic.org/files/spc_file_format.txt
 */

import { assert, TextDecoder } from "./isomorphic.js";

const FILE_HEADER = "SNES-SPC700 Sound File Data v0.30";

enum Emulator {
  unknown,
  zsnes,
  snes9x,
}

export interface SpcRegisters {
  pc: number;
  a: number;
  x: number;
  y: number;
  psw: number;
  sp: number;
}

export interface SpcFile {
  registers: SpcRegisters;
  ram: Uint8Array;
  dspRegisters: Uint8Array;
  extraRam: Uint8Array;
  rawId666: {
    songTitle: string;
    gameTitle: string;
    nameOfDumper: string;
    comments: string;
    dateSpcWasDumped?: Date;
    playDurationBeforeFadingOut: number;
    fadeDuration: number;
    songArtist: string;
    defaultChannelState: boolean[];
    emulatorUsedToDump: Emulator;
  };
}

const textDecoder = new TextDecoder();

const readString = (buffer: Uint8Array, index, count) => {
  return textDecoder
    .decode(buffer.subarray(index, index + count))
    .replace(/[\x00 ]+$/g, "");
};

export const loadSpcFile = (buffer: Uint8Array): SpcFile => {
  const textDecoder = new TextDecoder();
  const dataView = new DataView(buffer.buffer);

  // Check file header.
  const fileHeader = textDecoder.decode(buffer.subarray(0x00, 33));
  assert(fileHeader === FILE_HEADER, "Unexpected file header");
  assert(buffer[0x21] === 26, "Unexpected file header");
  assert(buffer[0x22] === 26, "Unexpected file header");
  assert([26, 27].includes(buffer[0x23]), "Unexpected file header");
  assert(buffer[0x24] === 30, "Unexpected file header");
  const containsId666 = buffer[0x23] === 26;

  // Registers
  const pc = dataView.getUint16(0x25, true);
  const a = buffer[0x27];
  const x = buffer[0x28];
  const y = buffer[0x29];
  const psw = buffer[0x2a];
  const sp = buffer[0x2b];

  // ID666
  // TODO: Support binary id666.
  const songTitle = readString(buffer, 0x2e, 32);
  const gameTitle = readString(buffer, 0x4e, 32);
  const nameOfDumper = readString(buffer, 0x6e, 16);
  const comments = readString(buffer, 0x7e, 32);
  const songArtist = readString(buffer, 0xb1, 32);
  // TODO: Safer parsing
  const dateSpcWasDumped = new Date(readString(buffer, 0x9e, 11));
  const playDurationBeforeFadingOut = parseInt(readString(buffer, 0xa9, 3));
  const fadeDuration = parseInt(readString(buffer, 0xac, 5));
  const defaultChannelState = [true, true, true, true, true, true, true, true]; // buffer[0xd1];
  const emulatorUsedToDump = parseInt(readString(buffer, 0xd2, 1));

  const ram = new Uint8Array(buffer.subarray(0x100, 0x10100)); // 65536 bytes
  const dspRegisters = new Uint8Array(buffer.subarray(0x10100, 0x10180)); // 128 bytes
  const extraRam = new Uint8Array(buffer.subarray(0x101c0, 0x10200)); // 65536 bytes

  // TODO: Parse extended id666.

  return {
    registers: {
      pc,
      a,
      x,
      y,
      psw,
      sp,
    },
    rawId666: {
      songTitle,
      gameTitle,
      nameOfDumper,
      comments,
      dateSpcWasDumped,
      playDurationBeforeFadingOut,
      fadeDuration,
      songArtist,
      defaultChannelState,
      emulatorUsedToDump,
    },
    ram,
    dspRegisters,
    extraRam,
  };
};
