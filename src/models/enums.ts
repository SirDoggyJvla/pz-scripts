export enum ThemeColorType {
    ID = "entity.name.class",
    ScriptBlock = "keyword.control",
    Boolean = "constant.language.boolean",
    Parameter = "variable.parameter",
    Number = "constant.numeric.pz",
    FullType = 'support.type.property-name',
}

export enum DiagnosticType {
    missingComma = "Missing comma",
    unmatchedBrace = "Missing closing bracket '}' for '{scriptBlock}' block",
    notValidBlock = "'{scriptBlock}' is not a valid script block",
    missingParentBlock = "'{scriptBlock}' block must be inside a valid parent block: {parentBlocks}",
    hasParentBlock = "'{scriptBlock}' block cannot be inside any parent block",
    wrongParentBlock = "'{scriptBlock}' block cannot be inside parent block '{parentBlock}'. Valid parent blocks are: {parentBlocks}",
    missingChildBlock = "'{scriptBlock}' block must have child blocks: {childBlocks}",
}

// Helper function to format
export function formatDiagnostic(message: string, params: Record<string, string>): string {
    return message.replace(/{(\w+)}/g, (_, key) => params[key] ?? "");
}