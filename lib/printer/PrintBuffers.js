// Keeps a raw and a formatted copy of all the data
export class DualBuffer {
	#pretty = '';
	#raw = '';

	pretty(){
		return this.#pretty;
	}

	raw(){
		return this.#raw;
	}

	text(string){
		this.#pretty += string;
		this.#raw += string;
	}

	format(symbol){
		this.#pretty += symbol;
	}

	discard(){
		this.#pretty = '';
		this.#raw = '';
	}
}

// Keeps only the formatted copy of the data
export class PrettyBuffer {
	#pretty = '';

	pretty(){
		return this.#pretty;
	}

	raw(){
		return undefined;
	}

	text(string){
		this.#pretty += string;
	}

	format(symbol){
		this.#pretty += symbol;
	}

	discard(){
		this.#pretty = '';
	}
}

// Keeps only the raw copy of the data
export class RawBuffer {
	#raw = '';

	pretty(){
		return undefined;
	}

	raw(){
		return this.#raw;
	}

	text(string){
		this.#raw += string;
	}

	format(symbol){}

	discard(){
		this.#raw = '';
	}
}