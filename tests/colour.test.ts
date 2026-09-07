import { describe, expect, it } from 'vitest';
import { colourOf, colourText, lerpColour } from '../index.js';

describe('a colour read out of its text', () => {
  it('reads hex in three digits and in six', () => {
    expect(colourOf('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(colourOf('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(colourOf('#1b1b1b')).toEqual({ r: 27, g: 27, b: 27, a: 1 });
  });

  it('reads the alpha a fourth or an eighth digit carries', () => {
    expect(colourOf('#f008')).toEqual({ r: 255, g: 0, b: 0, a: 136 / 255 });
    expect(colourOf('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 128 / 255 });
  });

  it('reads hex whichever case it is written in, and with room around it', () => {
    expect(colourOf('#FDBA74')).toEqual(colourOf('#fdba74'));
    expect(colourOf('  #f00  ')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('reads rgb and rgba, separated by commas or by spaces', () => {
    expect(colourOf('rgb(3, 105, 161)')).toEqual({ r: 3, g: 105, b: 161, a: 1 });
    expect(colourOf('rgb(3 105 161)')).toEqual({ r: 3, g: 105, b: 161, a: 1 });
    expect(colourOf('rgba(3, 105, 161, 0.5)')).toEqual({ r: 3, g: 105, b: 161, a: 0.5 });
    // CSS stopped keeping the two names apart, so either takes an alpha.
    expect(colourOf('rgb(3 105 161 / 0.5)')).toEqual({ r: 3, g: 105, b: 161, a: 0.5 });
  });

  it('reads a channel written as a percentage', () => {
    expect(colourOf('rgb(100%, 0%, 0%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(colourOf('rgba(0, 0, 0, 50%)')).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
  });

  it('refuses every other form rather than guessing at it', () => {
    for (const form of [
      'rebeccapurple',
      'red',
      'hsl(0, 100%, 50%)',
      'currentColor',
      'transparent',
      '#ff',
      '#fffff',
      '#ggg',
      'rgb(1, 2)',
      'rgb(1, 2, 3, 4, 5)',
      'rgb(a, b, c)',
      '',
    ]) {
      expect(colourOf(form)).toBeUndefined();
    }
  });
});

describe('a colour written back out', () => {
  it('is rgb where it is opaque and rgba where it is not', () => {
    expect(colourText({ r: 3, g: 105, b: 161, a: 1 })).toBe('rgb(3, 105, 161)');
    expect(colourText({ r: 3, g: 105, b: 161, a: 0.5 })).toBe('rgba(3, 105, 161, 0.5)');
  });

  it('reads back to what it was written from', () => {
    for (const form of ['#f00', '#1b1b1b', 'rgb(3, 105, 161)', 'rgba(0, 0, 0, 0.25)']) {
      expect(colourOf(colourText(colourOf(form)!))).toEqual(colourOf(form));
    }
  });

  it('holds a channel inside its own run', () => {
    expect(colourText({ r: -20, g: 300, b: 0, a: 4 })).toBe('rgb(0, 255, 0)');
  });
});

describe('a colour walked between two', () => {
  it('is either end at either end', () => {
    expect(lerpColour('#000', '#fff', 0)).toBe('rgb(0, 0, 0)');
    expect(lerpColour('#000', '#fff', 1)).toBe('rgb(255, 255, 255)');
  });

  it('is straight through each channel', () => {
    expect(lerpColour('#000', '#fff', 0.5)).toBe('rgb(128, 128, 128)');
    expect(lerpColour('rgb(0, 0, 0)', 'rgb(100, 200, 40)', 0.25)).toBe('rgb(25, 50, 10)');
  });

  it('walks the alpha with the channels', () => {
    expect(lerpColour('rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 1)', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
  });

  it('is nothing where either end is a form it cannot read', () => {
    expect(lerpColour('red', '#fff', 0.5)).toBeUndefined();
    expect(lerpColour('#fff', 'hsl(0, 0%, 0%)', 0.5)).toBeUndefined();
  });
});
