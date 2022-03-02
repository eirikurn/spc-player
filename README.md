# SPC Player (working title)

## What is this?

An exercise in writing a Super Nintendo music player from scratch. This involves loading SPC files (RAM dumps) and emulating the SPC700 sound processor along with the accompanying digital signal processor (DSP).

The end result is a series of audio samples that can be streamed to a file or your speakers.

## Why??

That's a good question. There are actually a lot of projects out there for playing SPC files on the web. Not only that, but they use mature open-source C emulation code transpiled into Web Assembly for maximum accuracy and performance.

So why am I writing this from scratch?

* I love Super Nintendo music and was curious how it was played.
* I want to learn the low-level architecture of the video game console I grew up with.
* I like the challenge of writing a "console" emulator from scratch.
* I have some ideas for interactive UI which would not be possible with the existing emulators.

## Status

### Core

- [x] Loading SPC files.
- [ ] Emulate SPC700 opcodes. 16/256 (6%) opcodes emulated.
- [ ] Emulate RAM access.
- [ ] Emulate timers.
- [ ] Emulate DSP.
- [ ] Emulate echo buffer.

[Reference](https://wiki.superfamicom.org/spc700-reference)

### Extra

- [ ] Support for extended id666 tags.
- [ ] Resampler.

More functionality coming later.
