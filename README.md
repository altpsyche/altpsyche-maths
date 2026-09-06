# @altpsyche/maths

The mathematics the figures on [altpsyche.dev](https://altpsyche.dev) are drawn from.

There is a line through this package. **Values and timing** are below it: vectors, a
transform, the four curves a change can travel along, and a value walked between keys over
the length of a clip. That half changes almost never. **Figures and painters** will sit
above it, and nothing below the line imports anything above it.

It has one door and no runtime dependencies.

```ts
import { sampleTrack, vec2, smoothstep } from '@altpsyche/maths';

sampleTrack(
  [
    { time: 0, value: 0, smooth: true },
    { time: 2, value: 1, smooth: true },
  ],
  1
); // 0.5, and still at both ends on the way
```

A key is flat where it is marked smooth, so two keys give four curves: a straight line, a
start from rest, a stop to rest, and a walk that is still at both ends. That is the whole
of the shape.

MIT.
