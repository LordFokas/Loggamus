export { Logger, LogLevel } from './lib/Logger.js';

export { PrettyPrinter } from './lib/printer/PrettyPrinter.js';

export { Output } from './lib/pipeline/Output.js';
export { Pipe } from './lib/pipeline/Pipe.js';
export { Transformer } from './lib/pipeline/Transformer.js';

export { Factory } from './lib/factory/Factory.js';
export { Registry } from './lib/factory/Registry.js';



// ################################################################################################

import { Registry } from './lib/factory/Registry.js';
import { Output } from './lib/pipeline/Output.js';
import { Pipe } from './lib/pipeline/Pipe.js';
import { Transformer } from './lib/pipeline/Transformer.js';

Registry.Pipes.putBuilder('loggamus:Pipe', Pipe.$build);
Registry.Pipes.putBuilder('loggamus:Transformer.MetadataHeader', Transformer.MetadataHeader.$build);

Registry.Outputs.putBuilder('loggamus:Output.Terminal', Output.Terminal.$build);
Registry.Outputs.putBuilder('loggamus:Output.File', Output.File.$build);