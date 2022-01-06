import * as util from 'node:util';
import * as fs from 'node:fs';

export interface Stream {
	write: (...data:any[]) => void;
}

export class Output {
	#usesPretty = false;
	#usesRaw    = false;

	constructor(pretty:boolean, raw:boolean){
		this.$setStreams(pretty, raw);
	}

	write(pretty:string, raw:string|object, meta:object) : void {
		throw new Error('Not Implemented');
	}

	usesPretty() : boolean { return this.#usesPretty; }
	usesRaw   () : boolean { return this.#usesRaw; }

	$setStreams(pretty:boolean, raw:boolean) : void {
		this.#usesPretty = !!pretty;
		this.#usesRaw    = !!raw;
	}

	static Terminal = class Terminal extends Output {
		#stream:Stream;

		constructor(stream:Stream = process.stdout, colors:boolean = true){
			super(colors, !colors);
			this.#stream = stream;
		}

		write(pretty:string, raw:string|object, meta:object) : void {
			this.#stream.write(pretty);
		}
	};

	static File = class File extends Output {
		#path:string;

		constructor(path:string){
			super(false, true);
			if(!path) throw new Error('An output file path is mandatory!');
			this.#path = path;
		}

		write(pretty:string, raw:string|object, meta:object){
			if(typeof raw !== 'string'){
				raw = util.inspect(raw);
			}
			fs.appendFile(this.#path, raw+'\n', (error) => {
				if(error) throw error;
			});
		}
	};
}