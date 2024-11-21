import { CapitalizarPipe } from './pipes/capitalizar.pipe';

describe('CapitalizarPipe', () => {
  it('create an instance', () => {
    const pipe = new CapitalizarPipe();
    expect(pipe).toBeTruthy();
  });
});
