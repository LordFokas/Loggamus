console.log("\n\n\n");

import fs from 'node:fs';
import { Logger, Factory, Registry } from '../index.js';

Logger.setAppRoot(3);


const config = JSON.parse(fs.readFileSync('./examples/config.json'));
Factory.assemblePipeline(config);


(function (){
	Logger.fatal("This is a fatal error!");
})();

(function named_function(){
	Logger.error("This is a recoverable error...");
})();

Logger.warn("I'll only warn you this once.");
Logger.info("Information is the currency of modern times...");
Logger.debug("Debugging: The fun mystery game where you are\nthe detective, the victim, and the murderer!!");
Logger.fine("This level of information is so fine that it probably doesn't matter.");



console.log("\n\n\n");