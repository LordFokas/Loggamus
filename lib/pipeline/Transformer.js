import util from 'node:util';
import { Pipe } from './Pipe.js';

export class Transformer extends Pipe {
	constructor(...downstreams){
		super(...downstreams);
	}

	static MetadataHeader = class MetadataHeader extends Transformer {
		#s1 = '*'.repeat(80);
		#s2 = '-'.repeat(80);

		constructor(...downstreams){
			super(...downstreams);
		}

		write(pretty, raw, meta){
			super.write(
				this.#enrich(pretty, meta),
				this.#enrich(raw,    meta),
				meta
			);
		}

		#enrich(data, meta){
			if(!data) return '';
			return (
				this.#s1 +'\n'+ 
				util.inspect(meta||{}) +'\n'+
				this.#s2 +'\n'+
				data +'\n'+
				this.#s1 +'\n\n\n'
			);
		}
	}
}