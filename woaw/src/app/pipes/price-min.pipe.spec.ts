import { PriceMinPipe } from './price-min.pipe';

describe('PriceMinPipe', () => {
  it('create an instance', () => {
    const pipe = new PriceMinPipe();
    expect(pipe).toBeTruthy();
  });
});
