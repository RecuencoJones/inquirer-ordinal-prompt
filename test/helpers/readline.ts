import { Interface as ReadlineInterface } from 'readline';
import { EventEmitter } from 'events';
import * as util from 'util';
import * as _ from 'lodash';

const stub = {};

const output = {
  end: jest.fn(),
  mute: jest.fn(),
  unmute: jest.fn(),
  __raw__: '',
  write(str: string) {
    this.__raw__ += str;
  }
};

_.extend(stub, {
  write: jest.fn().mockReturnValue(stub),
  moveCursor: jest.fn().mockReturnValue(stub),
  setPrompt: jest.fn().mockReturnValue(stub),
  close: jest.fn().mockReturnValue(stub),
  pause: jest.fn().mockReturnValue(stub),
  resume: jest.fn().mockReturnValue(stub),
  _getCursorPos: jest.fn().mockReturnValue({ cols: 0, rows: 0 }),
  output
});

export class ReadlineStub extends EventEmitter {
  public line = '';
  public input = new EventEmitter();
  public output: typeof output;
}

util.inherits(ReadlineStub, EventEmitter);
_.assign(ReadlineStub.prototype, stub);

export function createReadlineStub(): ReadlineStub & ReadlineInterface {
  return new ReadlineStub() as any;
}
