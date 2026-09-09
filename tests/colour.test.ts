import { describe, expect, it } from 'vitest';
import { colourFrom, colourOf, colourText, hexOf, lerpColour } from '../index.js';

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

describe('a colour built from its text', () => {
  it('carries the name a sheet themes it under, and none where it is given none', () => {
    expect(colourFrom('#1b1b1b', 'ink')).toEqual({ r: 27, g: 27, b: 27, a: 1, name: 'ink' });
    expect(colourFrom('#1b1b1b')).toEqual({ r: 27, g: 27, b: 27, a: 1 });
  });

  it('refuses a form it cannot read, naming the text it was given', () => {
    expect(() => colourFrom('rebeccapurple')).toThrow(
      'a colour is a hex or an rgb() and this is neither: rebeccapurple'
    );
    expect(() => colourFrom('hsl(0, 100%, 50%)')).toThrow('hsl(0, 100%, 50%)');
  });
});

describe('a colour written back out as hex', () => {
  it('is six digits where it is opaque and eight where it is not', () => {
    expect(hexOf({ r: 3, g: 105, b: 161, a: 1 })).toBe('#0369a1');
    expect(hexOf({ r: 255, g: 0, b: 0, a: 128 / 255 })).toBe('#ff000080');
  });

  it('writes back the hex it was read from, which is what holds a sheet byte for byte', () => {
    for (const form of ['#1b1b1b', '#fdba74', '#0369a1', '#ff000080']) {
      expect(hexOf(colourOf(form)!)).toBe(form);
    }
  });

  it('grows a three-digit hex to six, since a channel is a whole number', () => {
    expect(hexOf(colourOf('#f00')!)).toBe('#ff0000');
  });

  it('holds a channel inside its own run', () => {
    expect(hexOf({ r: -20, g: 300, b: 0, a: 4 })).toBe('#00ff00');
  });
});

describe('a colour walked between two', () => {
  const black = colourFrom('#000');
  const white = colourFrom('#fff');

  it('is either end at either end', () => {
    expect(lerpColour(black, white, 0)).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(lerpColour(black, white, 1)).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it('is straight through each channel', () => {
    expect(hexOf(lerpColour(black, white, 0.5))).toBe('#808080');
    expect(hexOf(lerpColour(black, colourFrom('rgb(100, 200, 40)'), 0.25))).toBe('#19320a');
  });

  it('walks the alpha with the channels', () => {
    const clear = colourFrom('rgba(0, 0, 0, 0)');
    expect(lerpColour(clear, black, 0.5).a).toBeCloseTo(0.5, 12);
  });

  it('carries no name, since a page has no value for what lies between two it themes', () => {
    expect(lerpColour(colourFrom('#000', 'ink'), colourFrom('#fff', 'ground'), 0.5).name).toBeUndefined();
  });
});
