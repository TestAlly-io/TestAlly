import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/** CodeMirror measures layout via Range APIs; jsdom does not implement getClientRects. */
const emptyRectList = {
  length: 0,
  item: (): DOMRect | null => null,
  *[Symbol.iterator](): Generator<DOMRect> {},
} as DOMRectList;

Range.prototype.getClientRects = function (): DOMRectList {
  return emptyRectList;
};
Range.prototype.getBoundingClientRect = function (): DOMRect {
  return new DOMRect(0, 0, 0, 0);
};

afterEach(() => {
  cleanup();
});
