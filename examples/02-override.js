console.log("\n\n\n");


import { Logger, LogLevel, Pipe, Output } from '../index.js';
Logger.setAppRoot(3);

Logger.setDefault(new Logger('root', {
	minlevel: LogLevel.WARN,
	mintrace: LogLevel.FATAL,
	tracedepth: 5,
	output: new Pipe(
		new Output.Terminal(),
		new Output.File('./examples.log')
	)
}));


(function (){
	Logger.fatal("This is a fatal error!", {
		subject: 'this is custom metadata',
		function: 'anything we add here travels with our logs',
		destination: 'all the way to the target systems',
		correlationid: 'deadbeef-1337-cafe-babe-0123456789fe' // this is a valid UUID :)
	});
})();

(function named_function(){
	Logger.error("This is a recoverable error...");
})();

const child = Logger.getDefault().child('child-01');
child.warn("I'll only warn you this once.");
child.info("Information is the currency of modern times...");
child.debug("Debugging: The fun mystery game where you are\nthe detective, the victim, and the murderer!!");
child.fine("This level of information is so fine that it probably doesn't matter.");



console.log("\n\n\n");