import fs from 'node:fs';
import util from 'node:util';
import { Pipe } from './Pipe.js';

export class Output extends Pipe {
	constructor(pretty, raw){
		super();
		this.$setStreams(pretty, raw);
	}

	static Terminal = class Terminal extends Output {
		#stream = null;

		constructor(stream = process.stdout, colors=true){
			super(colors, !colors);
			this.#stream = stream;
		}

		write(pretty, raw, meta){
			this.#stream.write(pretty);
		}
	}

	static File = class File extends Output {
		#s1 = '='.repeat(40);
		#s2 = '-'.repeat(40);
		#path = null;

		constructor(path){
			super(false, true);
			if(!path) throw new Error('An output file path is mandatory!');
			this.#path = path;
		}

		write(pretty, raw, meta){
			const data = this.#s1 +'\n'+ util.inspect(meta) +'\n'+ this.#s2 +'\n'+ raw  +'\n'+ this.#s1 +'\n\n\n';
			fs.appendFile(this.#path, data, (error) => {
				if(error) throw error;
			});
		}
	}
}