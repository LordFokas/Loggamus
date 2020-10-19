import CallerID from 'caller-id';
import PrettyPrinter from './PrettyPrinter.js';

export class LogLevel {
	static FINE  = { l:0, n:'FINE'  };
	static DEBUG = { l:1, n:'DEBUG' };
	static INFO  = { l:2, n:'INFO'  };
	static WARN  = { l:3, n:'WARN'  };
	static ERROR = { l:4, n:'ERROR' };
	static FATAL = { l:5, n:'FATAL' };
}

export class Logger {
	static Level = LogLevel;
	static #default = new Logger('default');
	static #appRoot = null;

	static getDefault(){
		return Logger.#default;
	}

	static setDefault(logger){
		Logger.#default = logger;
	}

	// Sets the app root (initial portion of the path to be trimmed in trace sources)
	// parent: how many levels above the caller is the root. Default = 1.
	static setAppRoot(parent=1){
		const exp = new RegExp('([/\\\\][\\w\\._-]+){'+parent+'}$');
		const path = CallerID.getData(Logger.setAppRoot).filePath.replace(exp, '')+'/';
		Logger.#appRoot = new RegExp('^'+path);
	}

	static #addStackFrameInfo(data, print){
		print.endl().reset().color('yellow').style('bright').write('@ ');

		// Function Name
		if(data.functionName){
			if(data.typeName)
				print.write(data.typeName, '.');
			print.write(data.functionName);
		}else{
			print.reset().color('white').style('dim');
			print.write('<Lambda Function>');
			print.reset().color('yellow').style('bright');
		}

		// Source
		let path = data.filePath;
		if(Logger.#appRoot){
			path = path.replace(Logger.#appRoot, '');
		}
		print.write('  ( ', path, ':', data.lineNumber, ' )').endl();
	}

	// Shortcut logging methods. Metadata is optional and not printed by default, but other outputs (file, ELK, etc) might care.
	static fatal (message, meta){ Logger.#default.#_log(message, LogLevel.FATAL, CallerID.getData(Logger.fatal), meta); }
	static error (message, meta){ Logger.#default.#_log(message, LogLevel.ERROR, CallerID.getData(Logger.error), meta); }
	static warn  (message, meta){ Logger.#default.#_log(message, LogLevel.WARN,  CallerID.getData(Logger.warn),  meta); }
	static info  (message, meta){ Logger.#default.#_log(message, LogLevel.INFO,  CallerID.getData(Logger.info),  meta); }
	static debug (message, meta){ Logger.#default.#_log(message, LogLevel.DEBUG, CallerID.getData(Logger.debug), meta); }
	static fine  (message, meta){ Logger.#default.#_log(message, LogLevel.FINE,  CallerID.getData(Logger.fine),  meta); }

	static log(message, level=Level.FINE, meta){
		Logger.#default.#_log(message, level, CallerID.getData(Logger.log), meta);
	}

	// ########################################################################
	#name = null;
	#printer = null;
	#output = null;
	#tracenext = null;
	#minlevel = null;
	#mintrace = null;
	#styles = {
		'FINE'  : { color: 'white' , mods: [ ]           },
		'DEBUG' : { color: 'blue'  , mods: ['bright']    },
		'INFO'  : { color: 'green' , mods: [ ]           },
		'WARN'  : { color: 'yellow', mods: [ ]           },
		'ERROR' : { color: 'red'   , mods: ['bright']    },
		'FATAL' : { color: 'red'   , mods: ['underline'] }
	};

	constructor(name, options = {}){
		if(!name) throw new Error('Logger must be named!');
		this.#name = name;
		this.setOutput(options.output);
		this.setMinLevel(options.minlevel);
		this.setMinTrace(options.mintrace);
		this.applyStyles(options.styles);
	}

	child(name){
		if(!name) throw new Error('Child logger must be named!');
		return new Logger(this.name+'/'+name, {
			output: this.#output,
			minlevel: this.#minlevel,
			mintrace: this.#mintrace,
			styles: this.#styles
		});
	}

	setOutput(output = (pretty, raw, meta) => process.stdout.write(pretty)){
		this.#output = output;
		this.#printer = new PrettyPrinter(this.#output);
	}

	applyStyles(styles = {}){ // clone styles deep enough to prevent mutation.
		for(const level of Object.keys(styles)){
			this.#styles[level] = {
				color: styles[level].color || this.#styles[level].color,
				mods: [ ...(styles[level].mods) ]
			};
		}
	}

	setMinLevel(level = LogLevel.FINE){
		this.#minlevel = level;
	}

	setMinTrace(trace = LogLevel.ERROR){
		this.#mintrace = trace;
	}

	// Shortcut logging methods. Metadata is optional and not printed by default, but other outputs (file, ELK, etc) might care.
	fatal (message, meta){ this.#_log(message, LogLevel.FATAL, CallerID.getData(this.fatal), meta); }
	error (message, meta){ this.#_log(message, LogLevel.ERROR, CallerID.getData(this.error), meta); }
	warn  (message, meta){ this.#_log(message, LogLevel.WARN,  CallerID.getData(this.warn),  meta); }
	info  (message, meta){ this.#_log(message, LogLevel.INFO,  CallerID.getData(this.info),  meta); }
	debug (message, meta){ this.#_log(message, LogLevel.DEBUG, CallerID.getData(this.debug), meta); }
	fine  (message, meta){ this.#_log(message, LogLevel.FINE,  CallerID.getData(this.fine),  meta); }

	log(message, level=Level.FINE, meta){
		this.#_log(message, level, CallerID.getData(this.log), meta);
	}

	// Logs a message, with a level.
	#_log(message, level=LogLevel.FINE, trace, meta){
		// Ignore messages below minimum log level;
		if(this.#minlevel.l > level.l) return;

		// Write message
		const style = this.#styles[level.n];
		this.#printer.color(style.color).style(...(style.mods));
		this.#printer.write(message);

		// Write caller stack frame
		let doTrace = this.#tracenext;
		if(doTrace === null){ // if not overriding trace, check min trace level.
			doTrace = level.l >= this.#mintrace.l;
		}else{ // otherwise clear trace override for next round.
			this.#tracenext = null;
		}
		if(doTrace){ // print information about the stack frame that called us.
			Logger.#addStackFrameInfo(trace, this.#printer);
		}

		// Flush all data to output with aditional metadata
		this.#printer.flush(1, {
			logger: this.#name,
			timestamp: new Date().toISOString(),
			level: level,
			caller: trace,
			metadata: meta
		});
	}

	forceStackTrace(trace){
		this.#tracenext = !!trace; // coerce trace to boolean.
		return this;
	}
}