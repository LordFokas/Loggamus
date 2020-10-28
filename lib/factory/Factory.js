import fs from 'node:fs';
import { Registry } from './Registry.js';
import { Logger } from '../Logger.js';

export class Factory {
	static assemblePipeline(config){
		// If string assume it's a JSON file and parse it
		if(typeof config === 'string'){
			const data = fs.readFileSync(config);
			config = JSON.parse(data);
		}

		// Validate configuration is object and declares components
		if(typeof config != 'object'){
			throw new Error('Pipeline Configuration must be an object');
		}else{
			let found = 0;
			for(const block of [config.outputs, config.pipes, config.loggers]){
				found += Object.keys(block).length;
			}
			if(!found){
				throw new Error('Pipeline Configuration must declare components');
			}
		}

		// Build all the components, bottom-up
		Factory.#buildOutputs(config.outputs);
		Factory.#buildPipes(config.pipes);
		Factory.#buildLoggers(config.loggers);

		// If a default logger is specified, assign it
		if(config.default){
			const logger = Registry.Loggers.getObject(config.default);
			if(!logger) throw new Error(`Cannot find default logger ${config.default}`);
			Logger.setDefault(logger);
		}
	}

	static #buildOutputs(outputs){
		if(!outputs) return;
		Object.entries(outputs).map(([name, config]) => {
			Factory.buildOutput(config.class, config.options, name)
		});
	}

	static #buildPipes(pipes){
		if(!pipes) return;
		Object.entries(pipes).map(([name, config]) => {
			Factory.#buildDownstream(name, config, true)
		});
	}

	static #buildLoggers(loggers){
		if(!loggers) return;
		Object.entries(loggers).map(([name, config]) => {
			Factory.buildLogger(config.options, config.children, name)
		});
	}

	static #buildDownstream(name, config, top){
		// shallow clone config object for working modifications
		config = Object.assign({}, config);

		// accomodate for top-level pipe constraints
		if(top){
			if(config.type){
				throw new Error(`Top level pipe "${name}" must NOT declare a type, "pipe" is inferred`);
			}else{
				config.type = 'pipe';
			}
		}

		// fetch or create the downstream
		switch(config.type){
			case 'output':
				// a name was defined, fetch this object
				if(config.name) return Registry.Outputs.getObject(config.name);

				// a name was not defined, build the output
				return Factory.buildOutput(config.class, config.options);

			case 'pipe':
				// a name was defined, fetch this object
				if(config.name) return Registry.Pipes.getObject(config.name);

				// a name was not defined, build the pipe. Downstreams are mandatory.
				if(!config.downstreams)
					throw new Error('All pipe configurations must contain downstreams');

				// materialize all downstreams before building the pipe
				const downstreams = config.downstreams.map(obj => {
					return Factory.#buildDownstream(undefined, obj, false);
				});

				// actually do build the pipe
				return Factory.buildPipe(config.class, config.options, downstreams, name);

			default: throw new Error(`Unrecognized downstream type "${config.type}"`);
		}
	}

	static buildOutput(path, options, name){
		return Factory.#build(Registry.Outputs, path, options, null, name);
	}

	static buildPipe(path, options, downstreams, name){
		return Factory.#build(Registry.Pipes, path, options, downstreams, name);
	}

	static #build(registry, path, options, downstreams, name){
		const builder = registry.getBuilder(path, true);
		const result = builder(options, downstreams);
		if(name) result.save(name);
		return result.object();
	}

	static buildLogger(options, children, name, parent){
		// ensure there is a name
		if(!name || typeof name != 'string' || name.length < 1)
			throw new Error('Logger names are mandatory');

		// shallow clone of options for working modifications
		options = Object.assign({}, options);

		// fetch or build dependencies -- this is what the shallow clone is for
		if(options.minlevel) options.minlevel = Registry.LogLevels.getObject(options.minlevel);
		if(options.mintrace) options.mintrace = Registry.LogLevels.getObject(options.mintrace);
		if(options.output) options.output = Factory.#buildDownstream(undefined, options.output, false);

		// build a new logger, or fork it from a given parent
		let logger;
		if(parent){
			logger = parent.child(name, options);
		}else{
			logger = new Logger(name, options);
		}

		// save in the registry for later
		Registry.Loggers.putObject(logger.name(), logger);

		// if any children are defined, fork them from this parent. This is a recursive call.
		if(children && (typeof children === 'object')){
			Object.entries(children).map(([child, config]) => {
				Factory.buildLogger(config.options, config.children, child, logger);
			});
		}
	}
}