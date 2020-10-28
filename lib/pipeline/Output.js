import fs from 'node:fs';
import { Pipe } from './Pipe.js';

export class Output extends Pipe {
	constructor(pretty, raw){
		super();
		this.$setStreams(pretty, raw);
	}

	write(pretty, raw, meta){
		throw new Error('Not Implemented');
	}

	static Terminal = class Terminal extends Output {
		static $build(options){
			return new Output.Terminal(options.stream, options.colors);
		}

		#stream = null;

		constructor(stream = process.stdout, colors=true){
			super(colors, !colors);
			if(stream === 'loggamus:stdout') stream = process.stdout;
			if(stream === 'loggamus:stderr') stream = process.stderr;
			this.#stream = stream;
		}

		write(pretty, raw, meta){
			this.#stream.write(pretty);
		}
	};

	static File = class File extends Output {
		static $build(options){
			return new Output.File(options.path);
		}

		#path = null;

		constructor(path){
			super(false, true);
			if(!path) throw new Error('An output file path is mandatory!');
			this.#path = path;
		}

		write(pretty, raw, meta){
			fs.appendFile(this.#path, raw, (error) => {
				if(error) throw error;
			});
		}
	};
}