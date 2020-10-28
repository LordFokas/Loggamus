export class Registry {
	static get Loggers  (){ return loggers;   }
	static get LogLevels(){ return loglevels; }
	static get Pipes  (){ return pipes;   }
	static get Outputs(){ return outputs; }

	static manifest(){
		return {
			'Loggers'  : Registry.Loggers.manifest(),
			'LogLevels': Registry.LogLevels.manifest(),
			'Pipes'  : Registry.Pipes.manifest(),
			'Outputs': Registry.Outputs.manifest()
		};
	}

	// ########################################################################

	#name = null;
	#objects = {};

	constructor(name){
		this.#name = name;
	}

	get name(){ return this.#name; }

	manifest(){
		const objects = {};
		Object.entries(this.#objects).map(([name, wrapper]) => objects[name] = wrapper.builder );
		return { objects: objects };
	}

	putObject(name, object){
		this.#save(name, object, false);
	}

	#save(name, object, builder){
		if(this.#objects[name])
			throw new Error(`There is already an object with the name "${name}"`);
		this.#objects[name] = {
			obj: object,
			builder: builder
		};
	}

	getObject(name, fail=false){
		if(!this.#objects[name])
			return null;
		return this.#objects[name].obj;
	}


	static Buildable = class Buildable extends Registry {
		#builders = {};

		constructor(name){
			super(name);
		}

		manifest(){
			const mf = super.manifest();
			mf.builders = Object.keys(this.#builders);
			return mf;
		}

		putBuilder(path, builder){
			if(typeof builder !== 'function')
				throw new Error(`Provided builder for path "${path}" is not a function`);
			if(this.#builders[path])
				throw new Error(`There is already a builder function in the path "${path}"`);
			this.#builders[path] = builder;
		}

		getBuilder(path, fail=false){
			if(!this.#builders[path] && fail)
				throw new Error(`There is no builder function in the path "${path}"`);
			return (...args) => {
				const obj = this.#builders[path](...args);
				return {
					object: () => obj,
					save: (nm) => this.#save(nm, obj, path)
				};
			};
		}
	};
}

const loggers   = new Registry('Loggers');
const loglevels = new Registry('LogLevels');
const pipes   = new Registry.Buildable('Pipes');
const outputs = new Registry.Buildable('Outputs');