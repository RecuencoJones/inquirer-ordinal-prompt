import { Interface as ReadLineInterface } from 'readline';
import * as chalk from 'chalk';
import * as cliCursor from 'cli-cursor';
import * as figures from 'figures';
import { map, takeUntil, filter, share } from 'rxjs/operators';
import { Answers, ListQuestionOptions } from 'inquirer';

import Base = require('inquirer/lib/prompts/base');
import observe = require('inquirer/lib/utils/events');
import Paginator = require('inquirer/lib/utils/paginator');
import Choices = require('inquirer/lib/objects/choices');
import Choice = require('inquirer/lib/objects/choice');

type ImplicitState = {
  value: string;
  isValid: boolean;
};

// Fix for @types/inquirer
type _Paginator = Paginator & {
  paginate(content: string, selectedIndex: number, pageSize?: number): string;
};

export class OrdinalPrompt extends Base<ListQuestionOptions> {
  public firstRender = true;
  private values: Array<string>;
  private pointer: number;
  private readonly paginator: _Paginator;
  private done: Function;
  private spaceKeyPressed: boolean;

  public constructor(question: ListQuestionOptions, rl: ReadLineInterface, answers?: Answers) {
    super(question, rl, answers);

    this.values = [];

    if (!this.opt.choices) {
      this.throwParamError('choices');
    }

    if (Array.isArray(this.opt.default)) {
      this.values = this.opt.default.reduce((accum: Array<string>, value: string) => {
        if (this.opt.choices.find({ value } as any)) {
          return updateSelectedValues(accum, value);
        }

        return accum;
      }, []);
    }

    this.pointer = 0;

    // Make sure no default is set (so it won't be printed)
    this.opt.default = null;

    this.paginator = new Paginator(this.screen);
  }

  /**
   * Start the Inquiry session
   * @param cb - Callback when prompt is done
   */

  public _run(cb: Function): OrdinalPrompt {
    this.done = cb;

    const events = observe(this.rl);

    const validation = this.handleSubmitEvents(
      events.line.pipe(map(this.getCurrentValue.bind(this)))
    );

    validation.success.forEach(this.onEnd.bind(this));
    validation.error.forEach(this.onError.bind(this));

    events.normalizedUpKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onUpKey.bind(this));
    events.normalizedDownKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onDownKey.bind(this));
    events.numberKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onNumberKey.bind(this));
    events.spaceKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onSpaceKey.bind(this));
    events.keypress
      .pipe(
        filter(({ key }) => key && key.name === 'r'),
        share()
      )
      .pipe(takeUntil(validation.success))
      .forEach(this.onResetKey.bind(this));

    // Init the prompt
    cliCursor.hide();
    this.render();
    this.firstRender = false;

    return this;
  }

  /**
   * Render the prompt to screen
   */
  public render(error?: boolean): void {
    // Render question
    let message = this.getQuestion();
    let bottomContent = '';

    if (!this.spaceKeyPressed) {
      message += `(Press ${ chalk.cyan.bold('<space>') } to select, ${ chalk.cyan.bold('<r>') } to reset)`;
    }

    // Render choices or answer depending on the state
    if (this.status === 'answered') {
      message += chalk.cyan(this.values.join(', '));
    } else {
      const choicesStr = renderChoices(this.opt.choices, this.values, this.pointer);
      const indexPosition = this.opt.choices.indexOf(this.opt.choices.getChoice(this.pointer) as Choice);

      message += `\n${ this.paginator.paginate(choicesStr, indexPosition, this.opt.pageSize) }`;
    }

    if (error) {
      bottomContent = `${ chalk.red('>> ') }${ error }`;
    }

    this.screen.render(message, bottomContent);
  }

  /**
   * When user press `enter` key
   */
  public onEnd(state: ImplicitState): void {
    this.status = 'answered';
    this.spaceKeyPressed = true;

    // Rerender prompt (and clean subline error)
    this.render();

    this.screen.done();
    cliCursor.show();
    this.done(state.value);
  }

  public onError(state: ImplicitState): void {
    this.render(state.isValid);
  }

  public getCurrentValue(): Array<string> {
    const choices = this.values.filter((value) => {
      const choice = this.opt.choices.find({ value } as any) as Choice;

      return choice && !choice.disabled;
    });

    return choices;
  }

  public onUpKey(): void {
    const len = this.opt.choices.realLength;

    this.pointer = this.pointer > 0 ? this.pointer - 1 : len - 1;
    this.render();
  }

  public onDownKey(): void {
    const len = this.opt.choices.realLength;

    this.pointer = this.pointer < len - 1 ? this.pointer + 1 : 0;
    this.render();
  }

  public onNumberKey(input: number): void {
    if (input <= this.opt.choices.realLength) {
      this.pointer = input - 1;
      this.toggleChoice(this.pointer);
    }

    this.render();
  }

  public onSpaceKey(): void {
    this.spaceKeyPressed = true;
    this.toggleChoice(this.pointer);
    this.render();
  }

  public onResetKey(): void {
    this.values = [];

    this.render();
  }

  public toggleChoice(index: number): void {
    const item = this.opt.choices.getChoice(index);

    if (item) {
      this.values = updateSelectedValues(this.values, item.value);
    }
  }
}

/**
 * Function for rendering ordinal choices
 * @param choices - List of prompt options
 * @param values - Ordered list of selected values
 * @param pointer - Position of the pointer
 * @return Rendered content
 */
function renderChoices(choices: Choices, values: Array<string>, pointer: number): string {
  let output = '';
  let separatorOffset = 0;

  choices.forEach((choice, i) => {
    if (choice.type === 'separator') {
      separatorOffset++;
      output += ` ${ choice }\n`;

      return;
    }

    if (choice.disabled) {
      separatorOffset++;
      output += ` - ${ choice.name }`;
      output += ` (${ typeof choice.disabled === 'string' ? choice.disabled : 'Disabled' })`;
    } else {
      const line = `${ getItemIndexOrBox(values.indexOf(choice.value)) } ${ choice.name }`;

      if (i - separatorOffset === pointer) {
        output += chalk.cyan(figures.pointer + line);
      } else {
        output += ` ${ line }`;
      }
    }

    output += '\n';
  });

  return output.replace(/\n$/, '');
}

/**
 * Get the index
 * @param index - add ordinal or not to the checkbox
 * @return Composited checkbox string
 */
function getItemIndexOrBox(index: number): string {
  return index >= 0 ? chalk.green(index + 1) : figures.radioOff;
}

/**
 * Update selected choices
 * @param values - ordered list of selected choices
 * @param newValue - choice to toggle
 * @returns Ordered list of selected choices
 */
function updateSelectedValues(values: Array<string>, newValue: string): Array<string> {
  if (values.includes(newValue)) {
    return values.filter((v) => v !== newValue);
  }

  return [ ...values, newValue ];
}

export default OrdinalPrompt;
