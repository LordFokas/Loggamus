import fs from 'node:fs';

export class Output {
	static Splitter = class Splitter {
		#outputs = [];

		constructor(...outputs){
			this.#outputs = outputs;
		}

		getOutputs(){ return this.#outputs; }
		setOutputs(...outputs){ this.#outputs = outputs; }

		write(pretty, raw, meta){
			for(const output of this.#outputs){
				output.write(pretty, raw, meta);
			}
		}
	}

	static Terminal = class Terminal {
		#stream = null;

		constructor(stream = process.stdout){
			this.#stream = stream;
		}

		write(pretty, raw, meta){
			this.#stream.write(pretty);
		}
	}

	static File = class File {
		#s1 = '='.repeat(40);
		#s2 = '-'.repeat(40);
		#path = null;

		constructor(path){
			if(!path) throw new Error('An output file path is mandatory!');
			this.#path = path;
		}

		write(pretty, raw, meta){
			fs.appendFile(this.#path,
				this.#s1 +'\n'+
					meta +'\n'+
				this.#s2 +'\n'+
					raw  +'\n'+
				this.#s1 +'\n\n\n'
			);
		}
	}
}