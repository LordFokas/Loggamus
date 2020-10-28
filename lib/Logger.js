import { PrettyPrinter } from './printer/PrettyPrinter.js';
import { Output } from './pipeline/Output.js';
import { Registry } from './factory/Registry.js';

export class LogLevel {
	// default Loggamus log levels. New ones can be defined.
	static FINE  = new LogLevel('loggamus', 'FINE' ,  0);
	static DEBUG = new LogLevel('loggamus', 'DEBUG', 10);
	static INFO  = new LogLevel('loggamus', 'INFO' , 20);
	static WARN  = new LogLevel('loggamus', 'WARN' , 30);
	static ERROR = new LogLevel('loggamus', 'ERROR', 40);
	static FATAL = new LogLevel('loggamus', 'FATAL', 50);

	// special levels to represent limits
	static $MIN  = new LogLevel('loggamus', '$MIN', -9999);
	static $MAX  = new LogLevel('loggamus', '$MAX',  9999);

	// ******************************************
	#ns; #name; #level; #path;
	namespace(){ return this.#ns; }
	name(){ return this.#name; }
	level(){ return this.#level; }
	path(){ return this.#path; }
	// ******************************************
	eq(ll){ return this.#level == ll.#level; }
	ne(ll){ return this.#level != ll.#level; }
	gt(ll){ return this.#level >  ll.#level; }
	ge(ll){ return this.#level >= ll.#level; }
	lt(ll){ return this.#level <  ll.#level; }
	le(ll){ return this.#level <= ll.#level; }
	// ******************************************

	constructor(ns, name, level){
		this.#ns = ns;
		this.#name = name;
		this.#level = level;
		this.#path = ns+':'+name;
		Registry.LogLevels.putObject(this.#path, this);
	}
}

export class Logger {
	static Level = LogLevel;
	static #terminal = new Output.Terminal();
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
		const exp = new RegExp('(?:[/\\\\][^/\\\\]+){'+parent+'}$');
		const path = Logger.#getStackTrace(1)[0].getFileName().replace(exp, '')+'/';
		Logger.#appRoot = new RegExp('^'+path);
	}

	// Shortcut logging methods. Metadata is optional and not printed by default, but other outputs (file, ELK, etc) might care.
	static fatal (message, meta){ Logger.#default.#_log(message, LogLevel.FATAL, meta); }
	static error (message, meta){ Logger.#default.#_log(message, LogLevel.ERROR, meta); }
	static warn  (message, meta){ Logger.#default.#_log(message, LogLevel.WARN,  meta); }
	static info  (message, meta){ Logger.#default.#_log(message, LogLevel.INFO,  meta); }
	static debug (message, meta){ Logger.#default.#_log(message, LogLevel.DEBUG, meta); }
	static fine  (message, meta){ Logger.#default.#_log(message, LogLevel.FINE,  meta); }

	static log(message, level=Level.FINE, meta){
		Logger.#default.#_log(message, level, meta);
	}

	static #getStackTrace(discard=0){
		const prepare = Error.prepareStackTrace;
		Error.prepareStackTrace = ($, stack) => stack;
		const error = new Error();
		Error.captureStackTrace(error);
		const stack = error.stack;
		Error.prepareStackTrace = prepare;
		return stack.slice(discard+1);
	}

	// ########################################################################
	#name = null;
	#printer = null;
	#output = null;
	#tracenext = null;
	#minlevel = null;
	#mintrace = null;
	#tracedepth = null;
	#styles = {
		'loggamus:FINE'  : { color: 'white' , mods: ['dim']        },
		'loggamus:DEBUG' : { color: 'blue'  , mods: ['bright']     },
		'loggamus:INFO'  : { color: 'green' , mods: [ ]            },
		'loggamus:WARN'  : { color: 'yellow', mods: [ ]            },
		'loggamus:ERROR' : { color: 'red'   , mods: ['bright']     },
		'loggamus:FATAL' : { color: 'red'   , mods: ['underscore'] },

		// call stack styles
		'$CALLSITE' : { color: 'yellow', mods: ['bright']     },
		'$LAMBDA'   : { color: 'white' , mods: ['dim']        },
		'$FUNCTION' : { color: 'yellow', mods: ['underscore'] }
	};

	constructor(name, options = {}){
		if(!name) throw new Error('Logger must be named!');
		this.#name = name;
		this.setOutput(options.output);
		this.setMinLevel(options.minlevel);
		this.setMinTrace(options.mintrace);
		this.setTraceDepth(options.tracedepth);
		this.applyStyles(options.styles);
	}

	name(){
		return this.#name;
	}

	child(name, options = {}){
		if(!name) throw new Error('Child logger must be named!');
		return new Logger(this.#name+'/'+name, {
			output: options.output || this.#output,
			minlevel: options.minlevel || this.#minlevel,
			mintrace: options.mintrace || this.#mintrace,
			tracedepth: options.tracedepth || this.#tracedepth,
			styles: options.styles || this.#styles
		});
	}

	setOutput(output){
		this.#output = output || Logger.#terminal;
		this.#printer = new PrettyPrinter(this.#output);
		return this;
	}

	applyStyles(styles = {}){ // clone styles deep enough to prevent mutation.
		for(const level of Object.keys(styles)){
			this.#styles[level] = {
				color: styles[level].color || this.#styles[level].color,
				mods: [ ...(styles[level].mods) ]
			};
		}
		return this;
	}

	setMinLevel(level = LogLevel.FINE){
		this.#minlevel = level;
		return this;
	}

	setMinTrace(trace = LogLevel.ERROR){
		this.#mintrace = trace;
		return this;
	}

	setTraceDepth(depth = 1){
		this.#tracedepth = depth;
		return this;
	}

	// Shortcut logging methods. Metadata is optional and not printed by default, but other outputs (file, ELK, etc) might care.
	fatal (message, meta){ this.#_log(message, LogLevel.FATAL, meta); }
	error (message, meta){ this.#_log(message, LogLevel.ERROR, meta); }
	warn  (message, meta){ this.#_log(message, LogLevel.WARN,  meta); }
	info  (message, meta){ this.#_log(message, LogLevel.INFO,  meta); }
	debug (message, meta){ this.#_log(message, LogLevel.DEBUG, meta); }
	fine  (message, meta){ this.#_log(message, LogLevel.FINE,  meta); }

	log(message, level=Level.FINE, meta){
		this.#_log(message, level, meta);
	}

	// Logs a message, with a level.
	#_log(message, level, meta){
		// Ignore messages below minimum log level;
		if(level.lt(this.#minlevel)) return;

		// Write message
		const style = this.#styles[level.path()];
		this.#printer.color(style.color).style(...(style.mods));
		this.#printer.write(message);

		// Write caller stack frame
		let doTrace = this.#tracenext;
		if(doTrace === null){ // if not overriding trace, check min trace level.
			doTrace = level.ge(this.#mintrace);
		}else{ // otherwise clear trace override for next round.
			this.#tracenext = null;
		}
		const stack = Logger.#getStackTrace(2);
		if(doTrace){ // print information about the stack frame that called us.
			this.#printer.endl()
			for(var i=0; i<this.#tracedepth && i<stack.length; i++)
				this.#addStackFrameInfo(stack[i], this.#printer, i==0, 'Logged', 'cyan');
		}

		// Flush all data to output with aditional metadata
		const metadata = {
			logger: this.#name,
			timestamp: new Date().toISOString(),
			caller: Logger.#getFrameCaller(stack[0]),
			source: Logger.#getFrameSource(stack[0]),
			level: level.name(),
			levelid: level.level(),
			levelns: level.namespace(),
			levelpath: level.path()
		};
		if(meta !== undefined)
			metadata.metadata = meta; // I'm So Meta Even This Acronym :)
		this.#printer.flush(1, metadata);
	}

	#addStackFrameInfo(frame, print, first, verb, vc){
		const c = this.#styles['$CALLSITE'];
		const l = this.#styles['$LAMBDA'];
		const f = this.#styles['$FUNCTION'];
		print.reset();
		if(first) print.color(vc).write(verb).reset();
		else print.write('      ');
		print.color(c.color).style(...(c.mods)).write(' at ');

		// Function Name
		if(frame.getFunctionName()){
			print.reset().color(f.color).style(...(f.mods));
			print.write(Logger.#getFrameCaller(frame));
		}else{
			print.reset().color(l.color).style(...(l.mods));
			print.write(Logger.#getFrameCaller(frame));
		}

		// Source
		print.reset().color(c.color).style(...(c.mods));
		print.write('  ( ', Logger.#getFrameSource(frame), ' )').endl();
	}

	forceStackTrace(trace){
		this.#tracenext = !!trace; // coerce trace to boolean.
		return this;
	}

	static #getFrameCaller(frame){
		if(!frame.getFunctionName())
			return '<Lambda Function>';
		let caller = '';
		if(frame.getTypeName())
			caller = frame.getTypeName().replace(/^Function$/, '[[Class]]') + '.';
		return caller + frame.getFunctionName();
	}

	static #getFrameSource(frame){
		let path = frame.getFileName();
		if(Logger.#appRoot){
			path = path.replace(Logger.#appRoot, '');
		}
		return path +':'+ frame.getLineNumber();
	}
}