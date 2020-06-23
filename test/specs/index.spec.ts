import * as _ from 'lodash';
import { ListQuestionOptions } from 'inquirer';
import { OrdinalPrompt } from '../../src/index';
import { createReadlineStub } from '../helpers/readline';
import * as fixtures from '../helpers/fixtures';

describe('`ordinal` prompt', () => {
  let rl: ReturnType<typeof createReadlineStub>;
  let question: ListQuestionOptions;
  let prompt: OrdinalPrompt;

  beforeEach(() => {
    rl = createReadlineStub();
    question = _.clone(fixtures.question);
    prompt = new OrdinalPrompt(question, rl);
  });

  it('should return a single selected choice in an array', async () => {
    const promise = prompt.run().then((answer) => {
      expect(answer).toBeInstanceOf(Array);
      expect(answer.length).toEqual(1);
      expect(answer[0]).toEqual('choice 1');
    });

    rl.input.emit('keypress', ' ', { name: 'space' });
    rl.emit('line');

    return promise;
  });

  it('should return multiples selected choices in an array', async () => {
    const promise = prompt.run().then((answer) => {
      expect(answer).toBeInstanceOf(Array);
      expect(answer.length).toEqual(2);
      expect(answer[0]).toEqual('choice 2');
      expect(answer[1]).toEqual('choice 1');
    });

    rl.input.emit('keypress', null, { name: 'down' });
    rl.input.emit('keypress', ' ', { name: 'space' });
    rl.input.emit('keypress', null, { name: 'up' });
    rl.input.emit('keypress', ' ', { name: 'space' });
    rl.emit('line');

    return promise;
  });

  it('should check defaults choices', async () => {
    question.default = [ '1' ];
    question.choices = [{ name: '1' }, { name: '2' }, { name: '3' }];
    prompt = new OrdinalPrompt(question, rl);

    const promise = prompt.run().then((answer) => {
      expect(answer.length).toEqual(1);
      expect(answer[0]).toEqual('1');
    });

    rl.emit('line');

    return promise;
  });

  it('provide an array of checked choice to validate', async () => {
    question.default = [ '1', '2' ];
    question.choices = [{ name: '1' }, { name: '2' }, { name: '3' }];
    question.validate = (answer) => {
      expect(answer).toEqual([ '1', '2' ]);

      return true;
    };

    prompt = new OrdinalPrompt(question, rl);

    const promise = prompt.run();

    rl.emit('line');

    return promise;
  });

  it('should check defaults choices if given as array of values', async () => {
    question.choices = [{ name: '1' }, { name: '2' }, { name: '3' }];
    question.default = [ '1', '3' ];
    prompt = new OrdinalPrompt(question, rl);

    const promise = prompt.run().then((answer) => {
      expect(answer.length).toEqual(2);
      expect(answer[0]).toEqual('1');
      expect(answer[1]).toEqual('3');
    });

    rl.emit('line');

    return promise;
  });

  it('should toggle choice when hitting space', async () => {
    const promise = prompt.run().then((answer) => {
      expect(answer.length).toEqual(1);
      expect(answer[0]).toEqual('choice 1');
    });

    rl.input.emit('keypress', ' ', { name: 'space' });
    rl.input.emit('keypress', null, { name: 'down' });
    rl.input.emit('keypress', ' ', { name: 'space' });
    rl.input.emit('keypress', ' ', { name: 'space' });
    rl.emit('line');

    return promise;
  });

  it('should allow for arrow navigation', async () => {
    const promise = prompt.run().then((answer) => {
      expect(answer.length).toEqual(1);
      expect(answer[0]).toEqual('choice 2');
    });

    rl.input.emit('keypress', null, { name: 'down' });
    rl.input.emit('keypress', null, { name: 'down' });
    rl.input.emit('keypress', null, { name: 'up' });

    rl.input.emit('keypress', ' ', { name: 'space' });
    rl.emit('line');

    return promise;
  });

  it('should allow for vi-style navigation', async () => {
    const promise = prompt.run().then((answer) => {
      expect(answer.length).toEqual(1);
      expect(answer[0]).toEqual('choice 2');
    });

    rl.input.emit('keypress', 'j', { name: 'j' });
    rl.input.emit('keypress', 'j', { name: 'j' });
    rl.input.emit('keypress', 'k', { name: 'k' });

    rl.input.emit('keypress', ' ', { name: 'space' });
    rl.emit('line');

    return promise;
  });

  it('should allow for emacs-style navigation', async () => {
    const promise = prompt.run().then((answer) => {
      expect(answer.length).toEqual(1);
      expect(answer[0]).toEqual('choice 2');
    });

    rl.input.emit('keypress', 'n', { name: 'n', ctrl: true });
    rl.input.emit('keypress', 'n', { name: 'n', ctrl: true });
    rl.input.emit('keypress', 'p', { name: 'p', ctrl: true });

    rl.input.emit('keypress', ' ', { name: 'space' });
    rl.emit('line');

    return promise;
  });

  it('should allow 1-9 shortcut key', async () => {
    const promise = prompt.run().then((answer) => {
      expect(answer.length).toEqual(1);
      expect(answer[0]).toEqual('choice 2');
    });

    rl.input.emit('keypress', '2');
    rl.emit('line');

    return promise;
  });

  it('should select no answers if <r> is pressed', async () => {
    const promise = prompt.run();

    rl.input.emit('keypress', 'a', { name: 'r' });
    rl.emit('line');

    return promise.then((answer) => {
      expect(answer.length).toEqual(0);
    });
  });

  describe('with disabled choices', () => {
    beforeEach(() => {
      (question.choices as any).push({
        name: 'dis1',
        disabled: true
      });
      (question.choices as any).push({
        name: 'dis2',
        disabled: 'uh oh'
      });
      prompt = new OrdinalPrompt(question, rl);
    });

    it('output disabled choices and custom messages', async () => {
      const promise = prompt.run();

      rl.emit('line');

      return promise.then(() => {
        expect(rl.output.__raw__).toContain('- dis1 (Disabled)');
        expect(rl.output.__raw__).toContain('- dis2 (uh oh)');
      });
    });

    it('skip disabled choices', async () => {
      const promise = prompt.run().then((answer) => {
        expect(answer[0]).toEqual('choice 1');
      });

      rl.input.emit('keypress', null, { name: 'down' });
      rl.input.emit('keypress', null, { name: 'down' });
      rl.input.emit('keypress', null, { name: 'down' });

      rl.input.emit('keypress', ' ', { name: 'space' });
      rl.emit('line');

      return promise;
    });

    it('uncheck defaults choices who\'re disabled', async () => {
      question.default = [ '1' ];
      question.choices = [{ name: '1', disabled: true }, { name: '2' }];
      prompt = new OrdinalPrompt(question, rl);

      const promise = prompt.run().then((answer) => {
        expect(answer.length).toEqual(0);
      });

      rl.emit('line');

      return promise;
    });

    it('disabled can be a function', async () => {
      question.choices = [
        {
          name: 'dis1',
          disabled(answers) {
            expect(answers.foo).toEqual('foo');

            return true;
          }
        }
      ];
      prompt = new OrdinalPrompt(question, rl, { foo: 'foo' });

      const promise = prompt.run();

      rl.emit('line');

      return promise.then(() => {
        expect(rl.output.__raw__).toContain('- dis1 (Disabled)');
      });
    });
  });
});
