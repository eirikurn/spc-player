import { loadSpcFile, SpcRegisters } from "./SpcLoader.js";
import { cyclesPerOpcode } from "./cpu/utils/opcodes.js";

const hex = (value: number, pad = 2) => {
  return value.toString(16).padStart(pad, "0");
};

const bin = (value: number, pad = 8) => {
  return value.toString(2).padStart(pad, "0");
};

export class Cpu {
  cycles = 0;
  pc: number;
  sp: number;
  a: number;
  x: number;
  y: number;
  p: number;
  nz: number;
  #psw: number;

  get psw(): number {
    const pswWithoutNZC = this.#psw & ~(0x80 | 0x20 | 0x02);
    const n = ((this.nz >> 1) | this.nz) & 0x80;
    const z = this.nz & 0xff ? 0 : 0x02;
    const p = this.p >> 3;
    return pswWithoutNZC | n | p | z;
  }

  constructor(public ram: Uint8Array, registers: SpcRegisters) {
    this.pc = registers.pc;
    this.sp = registers.sp;
    this.a = registers.a;
    this.x = registers.x;
    this.y = registers.y;
    this.#psw = registers.psw;
    this.p = (this.#psw & 0x20) << 3;
    this.nz = ((this.#psw & 0x02) ^ 0x02) + ((this.#psw << 1) & 0x100);
  }

  run(cycles: number) {
    const targetCycle = this.cycles + cycles;

    while (true) {
      this.debugState();

      const opcode = this.ram[this.pc];
      const opCycles = cyclesPerOpcode(opcode);

      if (this.cycles + opCycles > targetCycle) {
        break;
      }
      this.cycles += opCycles;

      this.eval(opcode);
    }
  }

  eval(opcode: number) {
    this.pc++;

    switch (opcode) {
      /**
       * 8-bit Data Transmission (Read)
       */
      // MOV A <- (dp)
      case 0xe4: {
        const dp = this.ram[this.pc++] + this.p;
        this.nz = this.a = this.ram[dp];
        // TODO: READ side-effect?
        break;
      }

      // MOV X <- imm
      case 0xcd: {
        const imm = this.ram[this.pc++];
        this.nz = this.x = imm;
        break;
      }

      /**
       * 8-bit Data Transmission (Reg->Reg, Mem->Mem)
       */
      // MOV (dp) <- imm
      case 0x8f: {
        const dp = this.ram[this.pc++] + this.p;
        const imm = this.ram[this.pc++];
        this.ram[dp] = imm;
        // TODO: WRITE side-effect?
        break;
      }

      /**
       * 8-bit Logical Operations
       */
      // EOR A ^= imm
      case 0x48: {
        const imm = this.ram[this.pc++];
        this.nz = this.a ^= imm;
        break;
      }
    }
  }

  debugState() {
    const opcode = this.ram[this.pc];
    const data = this.ram[this.pc + 1];
    console.log(
      `pc:${hex(this.pc, 4)} sp:${hex(this.sp)} a:${hex(this.a)} x:${hex(
        this.x
      )} y:${hex(this.y)} op:${hex(opcode)} data:${hex(data)} psw:${bin(
        this.psw
      )}`
    );
  }

  getRegisters(): SpcRegisters {
    return {
      x: this.x,
      y: this.y,
      pc: this.pc,
      sp: this.sp,
      a: this.a,
      psw: this.psw,
    };
  }
}

export { loadSpcFile };
