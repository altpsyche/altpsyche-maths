/**
 * The two demos the tests of the file read, as their own records.
 *
 * All four demos are records and all four are committed as files, and these two
 * are the smallest of them, which is what the cases about writing and reading
 * want. Nothing here assembles a record of its own: a second transcription
 * beside the demo's would be the same writing twice with nothing between the two
 * to disagree.
 */
export { written as operations } from '../demos/boolean.js';
export { written as turning } from '../demos/rotate.js';
