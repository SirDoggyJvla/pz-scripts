import { TextDocument, Position } from 'vscode';



// check if the position of the doc is within a script block
export function getBlockType(document: TextDocument, position: Position): 'item' | 'craftRecipe' | 'fixing' | null {
    let currentLine = position.line;
    console.debug("Checking block type for line: " + currentLine);
    
    while (currentLine >= 0) {
        const line = document.lineAt(currentLine).text.trim();
        // console.debug(line)
        
        if (line.includes('{')) {
            const previousLine = currentLine > 0 ? document.lineAt(currentLine - 1).text.trim() : '';
            // console.debug(previousLine)

            //TODO: improve to check for every type of script block
            if (previousLine.startsWith('item ')) {
                console.debug("Detected item block");
                return 'item';
            }
            if (previousLine.startsWith('craftRecipe ')) {
                console.debug("Detected craftRecipe block");
                return 'craftRecipe';
            }
            if (previousLine.startsWith('fixing ')) {
                console.debug("Detected fixing block");
                return 'fixing';
            }
            
            return null;
        }
        currentLine--;
    }
    return null;
}
