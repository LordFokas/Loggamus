import * as util from 'node:util';

import { type Output } from './Output.js';
import { Pipe } from './Pipe.js';

export class Mapper extends Pipe {
	constructor(...downstreams:Output[]){
		super(...downstreams);
	}

	write(pretty:string, raw:string|object, meta:object){
		super.write(
			(pretty && this.usesPretty()) ? this.data(pretty, meta) : undefined,
			(raw    && this.usesRaw()   ) ? this.data(raw,    meta) : undefined,
			this.meta(meta, pretty, raw)
		);
	}

	data(data:string|object, meta:object) : any { return data; }
	meta(meta:object, p:string, r:string|object) : object { return meta; }

	static ToPlainText = class ToPlainText extends Mapper {
		static #s1 = '*'.repeat(80);
		static #s2 = '-'.repeat(80);

		constructor(...downstreams:Output[]){
			super(...downstreams);
		}

		data(data:string, meta:object) : string {
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
		constructor(...downstreams:Output[]){
			super(...downstreams);
		}

		static _data(data:string|object, meta:object) : object {
			meta = JSON.parse(JSON.stringify(meta));
			if(typeof data === 'object'){
				data = JSON.parse(JSON.stringify(data));
			}
			return { ...meta, message: data };
		}

		data(data:string|object, meta:object) : object {
			return ToObject._data(data, meta);
		}
	};

	static ToJSON = class ToJSON extends Mapper {
		constructor(...downstreams:Output[]){
			super(...downstreams);
		}

		data(data:string|object, meta:object) : string {
			const obj = Mapper.ToObject._data(data, meta);
			return JSON.stringify(obj);
		}
	};
}