import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// jsdom 没有实现 SVGElement.transform，D3 对 transform 属性做插值时会读取 baseVal。
if (typeof SVGElement !== 'undefined' && !('transform' in SVGElement.prototype)) {
  const identity = {
    baseVal: {
      consolidate: () => ({
        matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
      })
    }
  };
  Object.defineProperty(SVGElement.prototype, 'transform', {
    configurable: true,
    get: () => identity
  });
}
