import { readFileSync } from "fs";
import { Cpu, loadSpcFile } from "../src/player.js";

const buf = readFileSync("../music/ct/ct-108.spc");
const spcFile = loadSpcFile(buf);

const cpu = new Cpu(spcFile.ram, spcFile.registers);
cpu.run(100);
