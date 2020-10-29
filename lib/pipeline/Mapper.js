import util from 'node:util';
import { Pipe } from './Pipe.js';

export class Mapper extends Pipe {
	constructor(...downstreams){
		super(...downstreams);
	}

	static ToPlainText = class ToPlainText extends Mapper {
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
	};

	static ToJSON = class ToJSON extends Mapper {
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
			meta = JSON.parse(JSON.stringify(meta));
			if(typeof data === 'object'){
				data = JSON.parse(JSON.stringify(data));
			}
			return { ...meta, message: data };
		}
	};
}