export class PrintBuffer {
	#pretty:string;
	#raw:string;

	pretty() : string                  { throw new Error("Please do not use type Buffer, it is a base class."); }
	raw() : string                     { throw new Error("Please do not use type Buffer, it is a base class."); }
	text(string:string) : void         { throw new Error("Please do not use type Buffer, it is a base class."); }
	format(symbol:string) : void       { throw new Error("Please do not use type Buffer, it is a base class."); }
	discard() : void                   { throw new Error("Please do not use type Buffer, it is a base class."); }
}

// Keeps a raw and a formatted copy of all the data
export class DualBuffer extends PrintBuffer {
	#pretty = '';
	#raw = '';

	pretty() : string {
		return this.#pretty;
	}

	raw() : string {
		return this.#raw;
	}

	text(string:string) : void {
		this.#pretty += string;
		this.#raw += string;
	}

	format(symbol:string) : void {
		this.#pretty += symbol;
	}

	discard() : void {
		this.#pretty = '';
		this.#raw = '';
	}
}

// Keeps only the formatted copy of the data
export class PrettyBuffer extends PrintBuffer {
	#pretty = '';

	pretty() : string {
		return this.#pretty;
	}

	raw() : string {
		return undefined;
	}

	text(string:string) : void {
		this.#pretty += string;
	}

	format(symbol:string) : void {
		this.#pretty += symbol;
	}

	discard() : void {
		this.#pretty = '';
	}
}

// Keeps only the raw copy of the data
export class RawBuffer extends PrintBuffer {
	#raw = '';

	pretty() : string {
		return undefined;
	}

	raw() : string {
		return this.#raw;
	}

	text(string:string) : void {
		this.#raw += string;
	}

	format(symbol:string) : void {}

	discard() : void {
		this.#raw = '';
	}
}