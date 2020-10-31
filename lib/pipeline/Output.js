import util from 'node:util';
import fs from 'node:fs';

export class Output {
	#usesPretty = false;
	#usesRaw    = false;

	constructor(pretty, raw){
		this.$setStreams(pretty, raw);
	}

	write(pretty, raw, meta){
		throw new Error('Not Implemented');
	}

	usesPretty(){ return this.#usesPretty; }
	usesRaw   (){ return this.#usesRaw; }

	$setStreams(pretty, raw){
		this.#usesPretty = !!pretty;
		this.#usesRaw    = !!raw;
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
	};

	static File = class File extends Output {
		#path = null;

		constructor(path){
			super(false, true);
			if(!path) throw new Error('An output file path is mandatory!');
			this.#path = path;
		}

		write(pretty, raw, meta){
			if(typeof raw !== 'string'){
				raw = util.inspect(raw);
			}
			fs.appendFile(this.#path, raw+'\n', (error) => {
				if(error) throw error;
			});
		}
	};
}