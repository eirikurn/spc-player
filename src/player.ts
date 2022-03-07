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
      // MOV A <- imm
      case 0xe8: {
        const imm = this.ram[this.pc++];
        this.nz = this.a = imm;
        break;
      }

      // MOV A <- (dp)
      case 0xe4: {
        const dp = this.ram[this.pc++] + this.p;
        this.nz = this.a = this.ram[dp];
        // TODO: READ side-effect?
        break;
      }

      // MOV A <- (abs)
      case 0xe5: {
        const abs = (this.ram[this.pc + 1] << 8) | this.ram[this.pc];
        this.pc += 2;
        this.nz = this.a = this.ram[abs];
        // TODO: READ side-effect?
        break;
      }

      // MOV A <- (abs+X)
      case 0xf5: {
        const abs = (this.ram[this.pc + 1] << 8) | this.ram[this.pc];
        this.pc += 2;
        this.nz = this.a = this.ram[abs + this.x];
        // TODO: READ side-effect?
        break;
      }

      // MOV A <- (abs+Y)
      case 0xf6: {
        const abs = (this.ram[this.pc + 1] << 8) | this.ram[this.pc];
        this.pc += 2;
        this.nz = this.a = this.ram[abs + this.y];
        // TODO: READ side-effect?
        break;
      }

      // MOV X <- imm
      case 0xcd: {
        const imm = this.ram[this.pc++];
        this.nz = this.x = imm;
        break;
      }

      // MOV Y <- imm
      case 0x8d: {
        const imm = this.ram[this.pc++];
        this.nz = this.y = imm;
        break;
      }

      /**
       * 8-bit Data Transmission (Write)
       */
      // MOV A -> (dp)
      case 0xc4: {
        const dp = this.ram[this.pc++] + this.p;
        this.ram[dp] = this.a;
        // TODO: WRITE side-effect?
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
      // AND A &= (dp)
      case 0x24: {
        const dp = this.ram[this.pc++] + this.p;
        this.nz = this.a &= this.ram[dp];
        // TODO: READ side-effect?
        break;
      }

      // EOR A ^= imm
      case 0x48: {
        const imm = this.ram[this.pc++];
        this.nz = this.a ^= imm;
        break;
      }

      /**
       * 8-bit Increment / Decrement Operations
       */
      // INC ++A
      case 0xbc: {
        this.a = (this.a + 1) & 0xff;
        this.nz = this.a;
        break;
      }

      // INC ++X
      case 0x3d: {
        this.x = (this.x + 1) & 0xff;
        this.nz = this.x;
        break;
      }

      // INC ++Y
      case 0xfc: {
        this.y = (this.y + 1) & 0xff;
        this.nz = this.y;
        break;
      }

      // INC --A
      case 0x9c: {
        this.a = (this.a - 1) & 0xff;
        this.nz = this.a;
        break;
      }

      // INC --X
      case 0x1d: {
        this.x = (this.x - 1) & 0xff;
        this.nz = this.x;
        break;
      }

      // INC --Y
      case 0xdc: {
        this.y = (this.y - 1) & 0xff;
        this.nz = this.y;
        break;
      }

      /**
       * 8-bit Shift / Rotation Operations
       */
      // LSR 0 >> (dp) >> C
      case 0x4b: {
        const dp = this.ram[this.pc++] + this.p;
        const value = this.ram[dp];
        // Save carry.
        this.#psw = (this.#psw & ~0x01) | (value & 0x01);
        this.nz = this.ram[dp] = value >> 1;
        break;
      }

      /**
       * Program Flow Operations
       */
      // BRA Branch (always)
      case 0x2f: {
        const rel = (this.ram[this.pc++] << 24) >> 24;
        this.pc += rel;
        break;
      }

      // BNE Branch if Equal (Z=1)
      case 0xf0: {
        const rel = (this.ram[this.pc++] << 24) >> 24;
        const z = this.nz & 0xff;
        if (!z) {
          this.pc += rel;
        } else {
          this.cycles -= 2;
        }
        break;
      }

      // BNE Branch if Not Equal (Z=0)
      case 0xd0: {
        const rel = (this.ram[this.pc++] << 24) >> 24;
        const z = this.nz & 0xff;
        if (z) {
          this.pc += rel;
        } else {
          this.cycles -= 2;
        }
        break;
      }

      // BCS Branch if Carry Set
      case 0xb0: {
        const rel = (this.ram[this.pc++] << 24) >> 24;
        const c = this.#psw & 0x01;
        if (c) {
          this.pc += rel;
        } else {
          this.cycles -= 2;
        }
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
