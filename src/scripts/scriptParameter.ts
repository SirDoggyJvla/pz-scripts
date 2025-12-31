import { ScriptBlock } from "./scriptBlocks";

export class ScriptParameter {
// MEMBERS
    // param data
    parent: ScriptBlock;
    name: string;

    // positions
    parameterStart: number;
    parameterEnd: number;
    valueStart: number;
    valueEnd: number;

// CONSTRUCTOR
    constructor(
        parent: ScriptBlock,
        name: string,
        parameterStart: number,
        parameterEnd: number,
        valueStart: number,
        valueEnd: number
    ) {
        this.parent = parent;
        this.name = name;
        this.parameterStart = parameterStart;
        this.parameterEnd = parameterEnd;
        this.valueStart = valueStart;
        this.valueEnd = valueEnd;
    }


}