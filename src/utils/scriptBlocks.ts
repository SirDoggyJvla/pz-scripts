import * as vscode from 'vscode';
import { Position, TextDocument, Diagnostic } from "vscode";
import { scriptBlockRegex } from '../models/regexPatterns';
import { DiagnosticType, formatDiagnostic } from '../models/enums';
import { isScriptBlock, getScriptBlockData } from '../models/scriptData';
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

        if (!this.validateBlock()) {
            return;
        }
        this.children = this.findChildBlocks();
        this.validateChildren();
    }

    public findChildBlocks(): ScriptBlock[] {
        const children: ScriptBlock[] = [];

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
            const blockType = match[1];
            const id = match[2];
            const headerStart = match.index + match[0].indexOf(blockType); // position of the block keyword
            const braceStart = blockHeader.lastIndex - 1; // position of the '{'

            // stop if the block is outside the current block
            let braceCount = 1;
            let i = braceStart + 1;
            if (i >= this.end) {
                break;
            }

            // find the matching closing brace
            for (; i < text.length; ++i) {
                if (text[i] === '{') braceCount++;
                else if (text[i] === '}') braceCount--;
                if (braceCount === 0) break;
            }

            // unmatched braces
            if (braceCount !== 0) {
                this.diagnosticBlockBraces(blockType, id ?? null, headerStart);
                break;
            }

            // create the child block
            const blockEnd = i + 1; // position after the '}'
            const startOffset = braceStart + 1;
            const endOffset = blockEnd;
            const childBlock = new ScriptBlock(
                document,
                this.diagnostics,
                this,
                blockType,
                id || null,
                startOffset,
                endOffset,
                headerStart
            );
            children.push(childBlock);
            searchPos = endOffset;
        
            // stop if we reached the end of this block
            if (searchPos >= this.end) {
                break;
            }
        }

        return children;
    }


// CHECKERS

    private validateBlock(): boolean {
        const type = this.type;
        if (type === "_DOCUMENT") {
            return true;
        }

        if (!isScriptBlock(type)) {
            this.diagnosticNotValidBlock(type, this.name, this.headerStart);
            return false;
        }

        if (!this.validateParent()) {
            return false;
        }

        return true;
    }

    private validateParent(): boolean {
        const blockData = getScriptBlockData(this.type);
        if (!blockData) {
            // abnormal case, because we already validate the block type exists before creating the ScriptBlock
            throw new Error(`Block data not found for type ${this.type} but should have been validated earlier (validateParent)`);
        }

        // check should have parent
        const shouldHaveParent = blockData.shouldHaveParent;
        if (shouldHaveParent) {
            if (!this.parent) {
                this.diagnosticNoParentBlock(this.type, this.name, this.headerStart);
                return false;
            }
        
        // shouldn't have parent
        } else {
            // but has one when shouldn't
            if (this.parent && this.parent.type !== "_DOCUMENT") {
                this.diagnosticHasParentBlock(this.type, this.name, this.headerStart);
                return false;
            }
            // all good, no parent as expected
            return true;
        }

        // check parent type
        const validParents = blockData.parents;
        if (validParents) {
            const parentType = this.parent.type;
            if (!validParents.includes(parentType)) {
                this.diagnosticWrongParentBlock(this.type, this.name, parentType, this.headerStart);
                return false;
            }
        }

        return true;
    }

    private validateChildren(): boolean {
        if (this.type === "_DOCUMENT") {
            return true;
        }

        const blockData = getScriptBlockData(this.type);
        if (!blockData) {
            // abnormal case, because we already validate the block type exists before creating the ScriptBlock
            throw new Error(`Block data not found for type ${this.type} but should have been validated earlier (validateChildren)`);
        }
        const validChildren = blockData.needsChildren;
        if (validChildren) {
            const childTypes = this.children.map(child => child.type);
            for (const neededChild of validChildren) {
                if (!childTypes.includes(neededChild)) {
                    this.diagnosticMissingChildBlock(this.type, this.name, this.headerStart);
                    return false;
                }
            }
        }

        return true;
    }


// DIAGNOSTICS HELPERS

    private diagnosticBlockBraces(block: string, id: string | null, index: number): void {
        const position = this.document.positionAt(index);
        const message = formatDiagnostic(DiagnosticType.unmatchedBrace, { scriptBlock: `${block}` });
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(position, position),
            message,
            vscode.DiagnosticSeverity.Error
        );
        this.diagnostics.push(diagnostic);
        console.warn(message);
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
        console.warn(message);
    }

    private diagnosticNoParentBlock(block: string, id: string | null, index: number): void {
        const position = this.document.positionAt(index);
        const blockData = getScriptBlockData(block);
        const parentBlocks = blockData?.parents?.join(", ") || "unknown";
        const message = formatDiagnostic(DiagnosticType.missingParentBlock, { scriptBlock: `${block}`, parentBlocks: parentBlocks });
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(position, position),
            message,
            vscode.DiagnosticSeverity.Error
        );
        this.diagnostics.push(diagnostic);
        console.warn(message);
    }

    private diagnosticHasParentBlock(block: string, id: string | null, index: number): void {
        const position = this.document.positionAt(index);
        const message = formatDiagnostic(DiagnosticType.hasParentBlock, { scriptBlock: `${block}` });
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(position, position),
            message,
            vscode.DiagnosticSeverity.Error
        );
        this.diagnostics.push(diagnostic);
        console.warn(message);
    }

    private diagnosticWrongParentBlock(block: string, id: string | null, parentBlock: string, index: number): void {
        const position = this.document.positionAt(index);
        const blockData = getScriptBlockData(block);
        const parentBlocks = blockData?.parents?.join(", ") || "unknown";
        const message = formatDiagnostic(DiagnosticType.wrongParentBlock, { scriptBlock: `${block}`, parentBlock: parentBlock, parentBlocks: parentBlocks });
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(position, position),
            message,
            vscode.DiagnosticSeverity.Error
        );
        this.diagnostics.push(diagnostic);
        console.warn(message);
    }

    private diagnosticMissingChildBlock(block: string, id: string | null, index: number): void {
        const position = this.document.positionAt(index);
        const blockData = getScriptBlockData(block);
        const childBlocks = blockData?.needsChildren?.join(", ") || "unknown";
        const message = formatDiagnostic(DiagnosticType.missingChildBlock, { scriptBlock: `${block}`, childBlocks: childBlocks });
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(position, position),
            message,
            vscode.DiagnosticSeverity.Error
        );
        this.diagnostics.push(diagnostic);
        console.warn(message);
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