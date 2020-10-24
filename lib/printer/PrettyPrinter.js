import { DualBuffer, PrettyBuffer, RawBuffer } from './PrintBuffers.js';
import { Output } from '../pipeline/Output.js';

//    BACKGROUND COLORS              FOREGROUND COLORS              MODIFIERS
const BgBlack   = "\x1b[40m";  const FgBlack   = "\x1b[30m";  const Reset      = "\x1b[0m";
const BgRed     = "\x1b[41m";  const FgRed     = "\x1b[31m";  const BrightBold = "\x1b[1m";
const BgGreen   = "\x1b[42m";  const FgGreen   = "\x1b[32m";  const Dim        = "\x1b[2m";
const BgYellow  = "\x1b[43m";  const FgYellow  = "\x1b[33m";  const Underscore = "\x1b[4m";
const BgBlue    = "\x1b[44m";  const FgBlue    = "\x1b[34m";  const Blink      = "\x1b[5m";
const BgMagenta = "\x1b[45m";  const FgMagenta = "\x1b[35m";  const Reverse    = "\x1b[7m";
const BgCyan    = "\x1b[46m";  const FgCyan    = "\x1b[36m";  const Hidden     = "\x1b[8m";
const BgWhite   = "\x1b[47m";  const FgWhite   = "\x1b[37m";

export class PrettyPrinter {
	static #terminal = new Output.Terminal();

	// Symbol groups
	static #bcolor = { black: BgBlack, red: BgRed, green: BgGreen, yellow: BgYellow, blue: BgBlue, magenta: BgMagenta, cyan: BgCyan, white: BgWhite };
	static #fcolor = { black: FgBlack, red: FgRed, green: FgGreen, yellow: FgYellow, blue: FgBlue, magenta: FgMagenta, cyan: FgCyan, white: FgWhite };
	static #styles = { dim: Dim, bright: BrightBold, underscore: Underscore, reset: Reset, blink: Blink, reverse: Reverse, hidden: Hidden };

	#output = null;
	#buffer = null;

	constructor(output){
		this.#output = output || PrettyPrinter.#terminal;
		let pretty = this.#output.usesPretty();
		let raw = this.#output.usesRaw();
		if(pretty && raw){
			this.#buffer = new DualBuffer();
		}else if(pretty){
			this.#buffer = new PrettyBuffer();
		}else if(raw){
			this.#buffer = new RawBuffer();
		}else{
			throw new Error('At least one buffer type is necessary!');
		}
	}

	write(...strings){
		for(const string of strings){
			this.#buffer.text(string);
		}
		return this;
	}

	endl(num = 1){
		return this.write('\n'.repeat(num));
	}

	#inject(array, ...keys){
		for(const key of keys){
			const symbol = array[key];
			if(!symbol) throw new Error('No such symbol! ('+key+')');
			else this.#buffer.format(symbol);
		}
		return this;
	}

	color(color){
		return this.#inject(PrettyPrinter.#fcolor, color);
	}

	background(color){
		return this.#inject(PrettyPrinter.#bcolor, color);
	}

	style(...symbols){
		return this.#inject(PrettyPrinter.#styles, ...symbols);
	}

	reset(){
		return this.style('reset');
	}

	flush(num, meta){
		if(num !== 0) this.endl(num);
		this.reset();
		this.#output.write(this.#buffer.pretty(), this.#buffer.raw(), meta);

		// Resets the printer, making it reusable. 
		this.#buffer.discard();
		return this;
	}
}