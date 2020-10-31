console.log("\n\n\n");


import { Logger, LogLevel, Pipe, Output, Mapper } from '../index.js';
Logger.setAppRoot(3); // paths in stack traces start 2 levels above this file

Logger.setDefault(new Logger('root', {
	minlevel: LogLevel.WARN, // Logs below WARN will not log
	mintrace: LogLevel.FATAL, // Logs below FATAL won't display stack traces
	tracedepth: 5, // stack traces are at most 5 stack frames deep
	output: new Pipe( // any pipe (except outputs) replicates logs it receives between its children
		new Output.Terminal(), // output that writes pretty logs to terminal
		new Mapper.ToPlainText( // map that adds metadata to the log message in plain text
			new Output.File('./example.log') // output that writes raw logs to disk
		)
	)
}));

class FatalExample{
	static kaboom(ex){
		Logger.fatal(ex, {
			subject: 'this is custom metadata',
			function: 'anything we add here travels with our logs',
			destination: 'all the way to the target systems',
			correlationid: 'deadbeef-1337-cafe-babe-0123456789fe' // this is a valid UUID :)
		});
	}
}

FatalExample.kaboom(new Error('This is an exception!'));

(function named_function(){
	Logger.error("This is a recoverable error...");
})();

// Child logger will inherit everything from the parent, unless we override it.
const child = Logger.getDefault().child('child-01');
child.warn("I'll only warn you this once.");

// these will never be seen because the log level is too high
child.info("Information is the currency of modern times...");
child.debug("Debugging: The fun mystery game where you are\nthe detective, the victim, and the murderer!!");
child.fine("This level of information is so fine that it probably doesn't matter.");



console.log("\n\n\n");