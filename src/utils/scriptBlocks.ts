import * as vscode from 'vscode';
import { Position, TextDocument, Diagnostic } from "vscode";
import { scriptBlockRegex } from '../models/regexPatterns';
import { DiagnosticType, formatDiagnostic } from '../models/enums';
import { isScriptBlock } from '../models/scriptData';
import { type } from 'os';

/**
 * Represents a script block in a PZ script file. Handles nested blocks and diagnostics.
 */
export class ScriptBlock {
    // members
    document: TextDocument;
    diagnostics: Diagnostic[];
    parent: ScriptBlock | null = null;
    type: string = "";
    name: string | null = null;
    start: number = 0;
    end: number = 0;
    lineStart: number = 0;
    lineEnd: number = 0;
    headerStart: number = 0;

    children: ScriptBlock[] = [];

    // constructors
    constructor(
        document: TextDocument,
        diagnostics: Diagnostic[],
        parent: ScriptBlock | null,
        type: string,
        name: string | null,
        start: number,
        end: number,
        headerStart: number
    ) {
        this.document = document;
        this.diagnostics = diagnostics;
        this.parent = parent;
        this.type = type;
        this.name = name;
        this.start = start;
        this.end = end;
        this.headerStart = headerStart;
        this.lineStart = document.positionAt(this.start).line;
        this.lineEnd = document.positionAt(this.end).line;

        // this isn't a valid script block, skip children parsing
        if (type !== "_DOCUMENT" && !isScriptBlock(type)) {
            this.diagnosticNotValidBlock(type, name, headerStart);
            return
        }

        this.children = this.findChildBlocks();
    }

    public findChildBlocks(): ScriptBlock[] {
        const children: ScriptBlock[] = [];

        console.debug(`Finding child blocks in ${this.type} ${this.name ?? ""} from ${this.start} to ${this.end}`);

        const document = this.document;
        const text = document.getText()

        const blockHeader = scriptBlockRegex;
        let match: RegExpExecArray | null;
        let searchPos = this.start;

        while (searchPos < text.length) {
            // find the first script block
            blockHeader.lastIndex = searchPos;
            match = blockHeader.exec(text);            
            if (!match) break;

            // retrieve the match informations
            const block = match[1];
            const id = match[2];
            const headerStart = match.index + match[0].indexOf(block); // position of the block keyword
            const braceStart = blockHeader.lastIndex - 1; // position of the '{'

            let braceCount = 1;
            let i = braceStart + 1;
            if (i >= this.end) {
                break;
            }

            for (; i < text.length; ++i) {
                if (text[i] === '{') braceCount++;
                else if (text[i] === '}') braceCount--;
                if (braceCount === 0) break;
            }

            const braceLineStart = document.positionAt(braceStart).line;
            const braceLineEnd = document.positionAt(i).line;

            if (braceCount !== 0) {
                this.diagnosticBlockBraces(block, id ?? null, headerStart);
                break;
            }

            console.debug(`Found block '${block} ${id ?? ""}' from line ${braceLineStart} to line ${braceLineEnd}`);


            const blockEnd = i + 1; // position after the '}'
            const content = text.substring(braceStart + 1, i);
            const startOffset = braceStart + 1;
            const endOffset = blockEnd;
            const childBlock = new ScriptBlock(
                document,
                this.diagnostics,
                this,
                block,
                id || null,
                startOffset,
                endOffset,
                headerStart
            );
            children.push(childBlock);
            searchPos = endOffset;
        
            if (searchPos >= this.end) {
                break;
            }
        }

        return children;
    }

    private diagnosticBlockBraces(block: string, id: string | null, index: number): void {
        const position = this.document.positionAt(index);
        const message = formatDiagnostic(DiagnosticType.unmatchedBrace, { scriptBlock: `${block}` });
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(position, position),
            message,
            vscode.DiagnosticSeverity.Error
        );
        this.diagnostics.push(diagnostic);
        console.warn(`Unmatched braces for block '${block}' starting at line ${position.line}`);
    }

    private diagnosticNotValidBlock(block: string, id: string | null, index: number): void {
        const position = this.document.positionAt(index);
        const message = formatDiagnostic(DiagnosticType.notValidBlock, { scriptBlock: `${block}` });
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(position, position),
            message,
            vscode.DiagnosticSeverity.Error
        );
        this.diagnostics.push(diagnostic);
        console.warn(`Not valid block '${block}' starting at line ${position.line}`);
    }
}

/**
 * A ScriptBlock that represents the entire document.
 */
export class DocumentBlock extends ScriptBlock {
    constructor(document: TextDocument, diagnostics: Diagnostic[]) {
        // Only document is provided
        const parent = null;
        const type = "_DOCUMENT";
        const name = null;
        const start = 0;
        const end = document.getText().length;
        super(document, diagnostics, parent, type, name, start, end, start);
    }
}