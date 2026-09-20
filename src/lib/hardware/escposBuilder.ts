/**
 * ESC/POS Thermal Command Builder
 * Formats low-level binary commands for 80mm/58mm receipt printers with drawer kick & cut.
 */

import { PaperWidth } from './types';

export class EscposBuilder {
  private buffer: number[] = [];
  private paperWidth: PaperWidth;
  private maxColumns: number;

  constructor(paperWidth: PaperWidth = '80mm') {
    this.paperWidth = paperWidth;
    this.maxColumns = paperWidth === '80mm' ? 48 : 32;
    this.init();
  }

  getPaperWidth(): PaperWidth {
    return this.paperWidth;
  }

  init(): this {
    this.buffer.push(0x1B, 0x40); // ESC @ (Initialize printer)
    return this;
  }

  align(alignment: 'left' | 'center' | 'right'): this {
    const val = alignment === 'left' ? 0x00 : alignment === 'center' ? 0x01 : 0x02;
    this.buffer.push(0x1B, 0x61, val); // ESC a n
    return this;
  }

  bold(enable = true): this {
    this.buffer.push(0x1B, 0x45, enable ? 0x01 : 0x00); // ESC E n
    return this;
  }

  doubleSize(enable = true): this {
    this.buffer.push(0x1D, 0x21, enable ? 0x11 : 0x00); // GS ! n
    return this;
  }

  text(str: string): this {
    const enc = new TextEncoder();
    const bytes = enc.encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  textLine(str = ''): this {
    this.text(str);
    this.buffer.push(0x0A); // LF
    return this;
  }

  divider(char = '-'): this {
    this.textLine(char.repeat(this.maxColumns));
    return this;
  }

  tableRow(left: string, right: string): this {
    const spaceCount = Math.max(1, this.maxColumns - left.length - right.length);
    const line = left + ' '.repeat(spaceCount) + right;
    this.textLine(line);
    return this;
  }

  threeColRow(col1: string, col2: string, col3: string, col1Width = 24, col2Width = 8): this {
    const c1 = col1.slice(0, col1Width).padEnd(col1Width, ' ');
    const c2 = col2.padStart(col2Width, ' ');
    const remaining = this.maxColumns - col1Width - col2Width;
    const c3 = col3.padStart(Math.max(1, remaining), ' ');
    this.textLine(c1 + c2 + c3);
    return this;
  }

  feed(lines = 3): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0A);
    }
    return this;
  }

  kickDrawer(): this {
    // ESC p m t1 t2 (Pulse to cash drawer pin 2, 50ms on, 500ms off)
    this.buffer.push(0x1B, 0x70, 0x00, 0x19, 0xFA);
    return this;
  }

  beep(): this {
    // ESC B n t (Beep 2 times)
    this.buffer.push(0x1B, 0x42, 0x02, 0x02);
    return this;
  }

  cut(): this {
    this.feed(3);
    this.buffer.push(0x1D, 0x56, 0x41, 0x00); // GS V 65 0 (Partial cut with feed)
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}
