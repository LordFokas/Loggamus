import * as fs from "node:fs";

export class ClassMapper {
    static #cache:Cache = {};

    static find(frame:NodeJS.CallSite) : string {
        if(frame.getThis()) return (frame.getThis() as Function).name;

        let line = frame.getLineNumber();
		let path = frame.getFileName();
		if(!path && !line) return '[[Class]]';

        if(!ClassMapper.#cache[path])
            ClassMapper.#process(path);
        for(const mapping of ClassMapper.#cache[path]){
            if(mapping.begin <= line && mapping.end >= line){
                return mapping.name;
            }
        }

        return '[[Class]]';
    }

    static #process(path:string){
        const mappings:Mapping[] = [];
        try {
            const lines = fs.readFileSync(path.replace("file://", "")).toString().split('\n');
            let start = 0;
            do{
                start = ClassMapper.#walk(lines, start, mappings);
            }while(start < lines.length - 1);
        } catch(silent){ }
        ClassMapper.#cache[path] = mappings;
    }

    static #walk(lines:string[], idx:number, mappings:Mapping[]) : number {
        let mapping:Partial<Mapping> = null;
        let open = 0;
        do{
            const line = lines[idx];
            if(!mapping){
                const match = line.match(/(?:^|\s+)class\s+([\$a-zA-Z0-9_]*)(?:\s+|\{)/);
                if(match){
                    mapping = { begin: idx+1, name: match[0].replace(/.*\s*class\s+/, "").split(/(?:\{|\s)/)[0] || '[[Anonymous]]' };
                    if(line.match(/\{\s*$/)) open++;
                }
            }else{
                if(line.match(/(?:^|\s+)class\s+([\$a-zA-Z0-9_]*)(?:\s+|\{)/)){
                    idx = ClassMapper.#walk(lines, idx, mappings);
                    continue;
                }
                const o = line.match(/(\{)/);
                if(o) open += o.length;
                const c = line.match(/(\})/);
                if(c) open -= c.length;
                if(open < 1){
                    mapping.end = idx+1;
                    mappings.push(mapping as Mapping);
                    return mapping.end;
                }
            }
            idx++;
        } while(idx < lines.length);
        return idx;
    }
}

interface Mapping {
    name: string
    begin: number
    end?: number
}

interface Cache {
    [key:string] : Mapping[]
}