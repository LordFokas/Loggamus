import util from 'node:util';
import { Pipe } from './Pipe.js';

export class Mapper extends Pipe {
	constructor(...downstreams){
		super(...downstreams);
	}

	write(pretty, raw, meta){
		super.write(
			(pretty && this.usesPretty()) ? this.data(pretty, meta) : undefined,
			(raw    && this.usesRaw()   ) ? this.data(raw,    meta) : undefined,
			 this.meta(meta, pretty, raw)
		);
	}

	data(data){ return data; }
	meta(meta, p, r){ return meta; }

	static ToPlainText = class ToPlainText extends Mapper {
		static #s1 = '*'.repeat(80);
		static #s2 = '-'.repeat(80);

		constructor(...downstreams){
			super(...downstreams);
		}

		data(data, meta){
			return (
				Mapper.ToPlainText.#s1 +'\n'+ 
				util.inspect(meta||{}) +'\n'+
				Mapper.ToPlainText.#s2 +'\n'+
				data +'\n'+
				Mapper.ToPlainText.#s1 +'\n\n\n'
			);
		}
	};

	static ToObject = class ToObject extends Mapper {
		constructor(...downstreams){
			super(...downstreams);
		}

		data(data, meta){
			meta = JSON.parse(JSON.stringify(meta));
			if(typeof data === 'object'){
				data = JSON.parse(JSON.stringify(data));
			}
			return { ...meta, message: data };
		}
	};

	static ToJSON = class ToJSON extends Mapper.ToObject {
		constructor(...downstreams){
			super(...downstreams);
		}

		data(data, meta){
			const obj = super.data(data, meta);
			return JSON.stringify(obj);
		}
	};
}