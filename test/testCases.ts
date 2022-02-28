/**
 * Ops ready:
 *
 * 0 1 2 3 4 5 6 7 8 9 A B C D E F
 *
 * - - - - - - - - - - - - - - - - 0
 * - - - - - - - - - - - - - - - - 1
 * - - - - r - - - - - - - - - - - 2
 * - - - - - - - - - - - - - - - - 3
 * - - - - - - - - X - - - - - - - 4
 * - - - - - - - - - - - - - - - - 5
 * - - - - - - - - - - - - - - - - 6
 * - - - - - - - - - - - - - - - - 7
 * - - - - - - - - - - - - - r - w 8
 * - - - - - - - - - - - - - - - - 9
 * - - - - - - - - - - - - - - - - A
 * - - - - - - - - - - - - - - - - B
 * - - - - w - - - - - - - X - - - C
 * - - - - - - - - - - - - - - - - D
 * - - - - r - - - r - - - - - - - E
 * - - - - - - - - - - - - - - - - F
 *
 * Legend:
 * "-": Not implemented.
 * "r": Implemented without read side effects.
 * "w": Implemented without write side effects.
 * "X": Fully implemented.
 */

export interface ExpandedRegisters {
  x: number;
  y: number;
  pc: number;
  sp: number;
  a: number;
  n: number;
  v: number;
  p: number;
  b: number;
  h: number;
  i: number;
  z: number;
  c: number;
}

export interface TestCase {
  before?: Partial<ExpandedRegisters>;
  beforeRam?: Record<number, number | number[]>;
  op: string;
  data: number[];
  after?: Partial<ExpandedRegisters>;
  afterRam?: Record<number, number | number[]>;
}

export const TEST_CASES: TestCase[] = [
  /**
   * 8-bit Data Transmission (Read)
   */
  // e8: MOV 2b  2c N-----Z- A <- imm
  { op: "e8", data: [0x12], after: { a: 0x12, n: 0, z: 0 } },
  { op: "e8", data: [0x00], after: { a: 0x00, n: 0, z: 1 } },
  { op: "e8", data: [0xff], after: { a: 0xff, n: 1, z: 0 } },

  // e4: MOV 2b  3c N-----Z- A <- (dp)
  { op: "e4", data: [0x10], before: { p: 0 }, beforeRam: { 0x10: 0x12 }, after: { a: 0x12, n: 0, z: 0 } },
  { op: "e4", data: [0x10], before: { p: 0 }, beforeRam: { 0x10: 0x00 }, after: { a: 0x00, n: 0, z: 1 } },
  { op: "e4", data: [0x10], before: { p: 0 }, beforeRam: { 0x10: 0xff }, after: { a: 0xff, n: 1, z: 0 } },
  { op: "e4", data: [0x10], before: { p: 1 }, beforeRam: { 0x110: 0x12 }, after: { a: 0x12, n: 0, z: 0 } },

  // cd: MOV 2b  2c N-----Z- X <- imm
  { op: "cd", data: [0x12], after: { x: 0x12, n: 0, z: 0 } },
  { op: "cd", data: [0x00], after: { x: 0x00, n: 0, z: 1 } },
  { op: "cd", data: [0xff], after: { x: 0xff, n: 1, z: 0 } },

  // 8d: MOV 2b  2c N-----Z- Y <- imm
  { op: "8d", data: [0x12], after: { y: 0x12, n: 0, z: 0 } },
  { op: "8d", data: [0x00], after: { y: 0x00, n: 0, z: 1 } },
  { op: "8d", data: [0xff], after: { y: 0xff, n: 1, z: 0 } },

  /**
   * 8-bit Data Transmission (Write)
   */
  // c4: MOV 2b  4c -------- A -> (dp)
  { op: "c4", data: [0x10], before: { a: 0x12, p: 0 }, afterRam: { 0x10: 0x12 } },
  { op: "c4", data: [0x10], before: { a: 0x12, p: 1 }, afterRam: { 0x110: 0x12 } },

  /**
   * 8-bit Data Transmission (Reg->Reg, Mem->Mem)
   */
  // 8f: MOV 3b  5c -------- (dp) <- imm
  { op: "8f", data: [0x10, 0x12], before: { p: 0 }, after: {}, afterRam: { 0x10: 0x12 } },
  { op: "8f", data: [0x10, 0x12], before: { p: 1 }, after: {}, afterRam: { 0x110: 0x12 } },

  /**
   * 8-bit Logical Operations
   */
  // 24: AND 2b  3c N-----Z- A &= (dp)
  { op: "24", data: [0x10], before: { a: 0x06, p: 0 }, beforeRam: { 0x10: 0x12 }, after: { a: 0x02, n: 0, z: 0 } },
  { op: "24", data: [0x10], before: { a: 0x06, p: 0 }, beforeRam: { 0x10: 0x00 }, after: { a: 0x00, n: 0, z: 1 } },
  { op: "24", data: [0x10], before: { a: 0xff, p: 0 }, beforeRam: { 0x10: 0xff }, after: { a: 0xff, n: 1, z: 0 } },
  { op: "24", data: [0x10], before: { a: 0x06, p: 1 }, beforeRam: { 0x110: 0x12 }, after: { a: 0x02, n: 0, z: 0 } },

  // 48: EOR 2b  2c N-----Z- A ^= imm
  { op: "48", data: [0x03], before: { a: 0x06 }, after: { a: 0x05, n: 0, z: 0 } },
  { op: "48", data: [0x06], before: { a: 0x06 }, after: { a: 0x00, n: 0, z: 1 } },
  { op: "48", data: [0xff], before: { a: 0x00 }, after: { a: 0xff, n: 1, z: 0 } },
];
