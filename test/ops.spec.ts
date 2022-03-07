import { Cpu } from "../src/player.js";
import { SpcRegisters } from "../src/SpcLoader.js";
import { bytesPerOpcode } from "../src/cpu/utils/opcodes.js";
import { ExpandedRegisters, TEST_CASES, TestCase } from "./testCases.js";

const ram = new Uint8Array(0x300);

const collapseRegisters = (registers: ExpandedRegisters): SpcRegisters => {
  const { n, v, p, b, h, i, z, c, ...rest } = registers;
  const psw =
    (registers.n << 7) |
    (registers.v << 6) |
    (registers.p << 5) |
    (registers.b << 4) |
    (registers.h << 3) |
    (registers.i << 2) |
    (registers.z << 1) |
    (registers.c << 0);
  return {
    ...rest,
    psw,
  };
};

const expandRegisters = (registers: SpcRegisters): ExpandedRegisters => {
  const { psw, ...rest } = registers;
  return {
    ...rest,
    n: (psw >> 7) & 1,
    v: (psw >> 6) & 1,
    p: (psw >> 5) & 1,
    b: (psw >> 4) & 1,
    h: (psw >> 3) & 1,
    i: (psw >> 2) & 1,
    z: (psw >> 1) & 1,
    c: (psw >> 0) & 1,
  };
};

interface CpuState {
  ram: Uint8Array;
  registers: SpcRegisters;
}

const createState = (testCase: TestCase): CpuState => {
  // Randomize ram.
  const seed = Math.random() * 256;
  for (let i = 0; i < ram.length; i++) {
    ram[i] = seed + i;
  }

  // Write test op to ram.
  ram[0x200] = parseInt(testCase.op, 16);
  const data = testCase.data ?? [];
  for (let i = 0; i < data.length; i++) {
    ram[0x201 + i] = data[i];
  }

  // Write requested ram changes
  Object.entries(testCase.beforeRam ?? {}).forEach(([addrStr, numOrArray]) => {
    const address = parseInt(addrStr, 10);
    const values = typeof numOrArray === "number" ? [numOrArray] : numOrArray;
    ram.set(values, address);
  });

  // Randomize registers (except pc).
  let registers = {
    pc: 0x200,
    a: (Math.random() * 256) | 0,
    x: (Math.random() * 256) | 0,
    y: (Math.random() * 256) | 0,
    sp: (Math.random() * 256) | 0,
    psw: (Math.random() * 256) | 0,
  };

  // Override registers.
  if (testCase.before) {
    registers = collapseRegisters(
      Object.assign(expandRegisters(registers), testCase.before)
    );
  }

  return {
    ram,
    registers,
  };
};

const checkState = (cpu: Cpu, initialState: CpuState, testCase: TestCase) => {
  const opcode = parseInt(testCase.op, 16);
  const cpuRegisters = expandRegisters(cpu.getRegisters());
  const targetRegisters = expandRegisters(initialState.registers);
  targetRegisters.pc += bytesPerOpcode(opcode);
  Object.assign(targetRegisters, testCase.after);

  expect(cpuRegisters).toMatchObject(targetRegisters);

  Object.entries(testCase.afterRam ?? {}).forEach(([addrStr, numOrArray]) => {
    const address = parseInt(addrStr, 10);
    const values = typeof numOrArray === "number" ? [numOrArray] : numOrArray;
    const data = Array.from(
      cpu.ram.subarray(+address, +address + values.length)
    );
    expect(data).toEqual(values);
  });
};

describe("Cpu", () => {
  test.each(TEST_CASES)("opcode $op test $#", (testCase) => {
    // Arrange
    const initialState = createState(testCase);
    const cpu = new Cpu(initialState.ram, initialState.registers);
    const op = parseInt(testCase.op, 16);

    // Act
    cpu.eval(op);

    // Assert
    checkState(cpu, initialState, testCase);
  });
});
