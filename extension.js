// -- IMPORTS

const vscode = require( "vscode" );

// -- VARIABLES

let indentation = '    ';
let screamCaseIdentifierCase = 'SCREAM_CASE';
let pascalCaseIdentifierCase = 'PascalCase';
let snakeCaseIdentifierCase = 'snake_case';
let camelCaseIdentifierCase = 'camelCase';

// -- FUNCTIONS

function getLineLevel(
    line
    )
{
    let level = 0;

    while ( line.startsWith( indentation ) )
    {
        ++level;

        line = line.slice( indentation.length );
    }

    return level;
}

// ~~

function getLineIndentation(
    line
    )
{
    line = line.trimRight();

    return line.slice( 0, line.length - line.trimLeft().length );
}

// ~~

function getLevelIndentation(
    level
    )
{
    let levelIndentation = '';

    while ( level > 0 )
    {
        levelIndentation += indentation;

        --level;
    }

    return levelIndentation;
}

// ~~

function getProcessedCode(
    code,
    codeProcessingFunction
    )
{
    let processedIntervalArray = [];
    let priorProcessedCharacterIndex = -2;
    let literalCharacter = '';

    for ( let characterIndex = 0;
          characterIndex + 1 < code.length;
          ++characterIndex )
    {
        let character = code[ characterIndex ];
        let nextCharacter = code[ characterIndex + 1 ];

        if ( literalCharacter !== '' )
        {
            if ( character === '\\' )
            {
                ++characterIndex;
            }
            else if ( character === literalCharacter
                      || ( character === '\n'
                           && literalCharacter !== '`' ) )
            {
                literalCharacter = '';
            }
        }
        else if ( character === '/'
                  && nextCharacter === '/' )
        {
            characterIndex += 2;

            while ( characterIndex < code.length
                    && code[ characterIndex ] !== '\n' )
            {
                ++characterIndex;
            }
        }
        else if ( character === '/'
                  && nextCharacter === '*' )
        {
            characterIndex += 2;

            while ( characterIndex + 1 < code.length
                    && code[ characterIndex ] !== '*'
                    && code[ characterIndex + 1 ] !== '/' )
            {
                ++characterIndex;
            }
        }
        else
        {
            if ( character === '/' )
            {
                let priorCode = code.slice( 0, characterIndex ).trimRight();

                if ( priorCode === ''
                     || priorCode.endsWith( '=' )
                     || priorCode.endsWith( '<' )
                     || priorCode.endsWith( '>' )
                     || priorCode.endsWith( '+' )
                     || priorCode.endsWith( '-' )
                     || priorCode.endsWith( '*' )
                     || priorCode.endsWith( '/' )
                     || priorCode.endsWith( '%' )
                     || priorCode.endsWith( '^' )
                     || priorCode.endsWith( '~' )
                     || priorCode.endsWith( '&' )
                     || priorCode.endsWith( '|' )
                     || priorCode.endsWith( '!' )
                     || priorCode.endsWith( '?' )
                     || priorCode.endsWith( ':' )
                     || priorCode.endsWith( '(' )
                     || priorCode.endsWith( '[' )
                     || priorCode.endsWith( '{' )
                     || priorCode.endsWith( ';' )
                     || priorCode.endsWith( ',' )
                     || priorCode.endsWith( ' return' )
                     || priorCode.endsWith( '\treturn' )
                     || priorCode.endsWith( '\rreturn' )
                     || priorCode.endsWith( '\nreturn' )
                     || priorCode === 'return' )
                {
                    literalCharacter = '/';

                    continue;
                }
            }

            if ( character === '\''
                 || character === '"'
                 || character === '`' )
            {
                literalCharacter = character;
            }
            else
            {
                if ( characterIndex !== priorProcessedCharacterIndex + 1 )
                {
                    processedIntervalArray.push( [ characterIndex, characterIndex + 1 ] );
                }
                else
                {
                    processedIntervalArray[ processedIntervalArray.length - 1 ][ 1 ] = characterIndex + 1;
                }

                priorProcessedCharacterIndex = characterIndex;
            }
        }
    }

    let processedIntervalCount = processedIntervalArray.length;

    if ( processedIntervalCount === 0 )
    {
        return code;
    }
    else
    {
        let processedCode = code.slice( 0, processedIntervalArray[ 0 ][ 0 ] );

        for ( let processedIntervalIndex = 0;
              processedIntervalIndex < processedIntervalCount;
              ++processedIntervalIndex )
        {
            let processedInterval = processedIntervalArray[ processedIntervalIndex ];

            if ( processedIntervalIndex > 0 )
            {
                let priorProcessedInterval = processedIntervalArray[ processedIntervalIndex - 1 ];

                processedCode += code.slice( priorProcessedInterval[ 1 ], processedInterval[ 0 ] );
            }

            processedCode
                += codeProcessingFunction(
                       code.slice( processedInterval[ 0 ], processedInterval[ 1 ] )
                       );
        }

        processedCode += code.slice( processedIntervalArray[ processedIntervalCount - 1 ][ 1 ] );

        return processedCode;
    }
}

// ~~

function replaceTabs(
    code
    )
{
    return code.replaceAll( '\t', indentation );
}

// ~~

function removeComments(
    code
    )
{
    return code.replace( /\/\/.*$/gm, '' );
}

// ~~

function splitBraces(
    code
    )
{
    code = removeTrailingSpaces( replaceTabs( code ) );

    return removeTrailingSpaces(
        code
            .replace(
                /^( *)([^\n]*)\{$/gm,
                function ( match, indentation, code )
                {
                    if ( code === '' )
                    {
                        return indentation + '{';
                    }
                    else if ( code.startsWith( '//' ) )
                    {
                        return indentation + code + '{';
                    }
                    else
                    {
                        return indentation + code + '\n' + indentation + '{';
                    }
                }
                )
            .replace(
                /^( *)\} *else$/gm,
                function ( match, indentation )
                {
                    return indentation + '}\n' + indentation + 'else';
                }
                )
            .replace(
                /^( *)\} *([^\n]+)$/gm,
                function ( match, indentation, code )
                {
                    if ( code.startsWith( ',' )
                         || code.startsWith( ';' ) )
                    {
                        return indentation + '}' + code;
                    }
                    else if ( code.startsWith( '//' ) )
                    {
                        return indentation + '}' + code;
                    }
                    else
                    {
                        return indentation + '}\n' + indentation + code;
                    }
                }
                )
        );
}

// ~~

function splitBrackets(
    code
    )
{
    code = removeTrailingSpaces( replaceTabs( code ) );

    return removeTrailingSpaces(
        code
            .replace(
                /^( *)([^\n]*\() *\[$/gm,
                function ( match, indentation, code )
                {
                    return indentation + code + '\n' + indentation + '[';
                }
                )
            .replace(
                /^( *)\] *\)(.*)$/gm,
                function ( match, indentation, code )
                {
                    return indentation + ']\n' + indentation + ')' + code;
                }
                )
        );
}

// ~~

function doubleLeadingSpaces(
    code
    )
{
    code = replaceTabs( code );

    return (
        code.replace(
            /^( +)/gm,
            function ( match )
            {
                return match.replaceAll( ' ', '  ' );
            }
            )
        );
}

// ~~

function removeTrailingSpaces(
    code
    )
{
    code = replaceTabs( code );

    return (
        code
            .replace(
                /[ \t]+$/gm,
                ''
                )
        );
}

// ~~

function removeTrailingCommas(
    code
    )
{
    return (
        code
            .replace(
                /,(?=\s*[)\]}])/gm,
                ''
                )
        );
}

// ~~

function indentBraces(
    code
    )
{
    let lineArray = code.split( '\n' );

    let levelArray = [];
    let nextLevelArray = [];
    let level = 0;

    for ( let lineIndex = 0;
          lineIndex < lineArray.length;
          ++lineIndex )
    {
        let line = lineArray[ lineIndex ].trimRight();

        if ( line !== '' )
        {
            level = getLineLevel( line );

            break;
        }
    }

    for ( let lineIndex = 0;
          lineIndex < lineArray.length;
          ++lineIndex )
    {
        let line = lineArray[ lineIndex ].trimRight();
        lineArray[ lineIndex ] = line;

        let trimmedLine = line.trimLeft();

        if ( trimmedLine.startsWith( '//' ) )
        {
            trimmedLine = '';
        }

        let nextLevel = level;

        while ( trimmedLine.endsWith( '(' )
                || trimmedLine.endsWith( '[' )
                || trimmedLine.endsWith( '{' ) )
        {
            ++nextLevel;

            trimmedLine = trimmedLine.slice( 0, -1 );
        }

        while ( trimmedLine.startsWith( ')' )
                || trimmedLine.startsWith( ']' )
                || trimmedLine.startsWith( '}' ) )
        {
            --nextLevel;

            if ( trimmedLine.startsWith( '}' ) )
            {
                --level;
            }

            trimmedLine = trimmedLine.slice( 1 );
        }

        levelArray.push( level );
        nextLevelArray.push( nextLevel );
        level = nextLevel;
    }

    for ( let lineIndex = 0;
          lineIndex < lineArray.length;
          ++lineIndex )
    {
        let line = lineArray[ lineIndex ];
        let level = levelArray[ lineIndex ];

        let lineIndentation = getLineIndentation( line );
        let levelIndentation = getLevelIndentation( level );

        if ( lineIndentation.length < levelIndentation.length )
        {
            let addedIndentation = levelIndentation.slice( 0, levelIndentation.length - lineIndentation.length );

            for ( let nextLineIndex = lineIndex;
                  nextLineIndex < lineArray.length;
                  ++nextLineIndex )
            {
                let nextLine = lineArray[ nextLineIndex ];
                let nextLevel = levelArray[ nextLineIndex ];

                if ( nextLevel >= level )
                {
                    lineArray[ nextLineIndex ] = addedIndentation + nextLine;
                }

                if ( nextLevel <= level )
                {
                    break;
                }
            }
        }
    }

    return lineArray.join( '\n' );
}

// ~~

function isBlankCharacter(
    character
    )
{
    return (
        character === ''
        || character === ' '
        || character === '\t'
        || character === '\r'
        || character === '\n'
        );
}

// ~~

function spaceBlocks(
    code,
    openingCharacter,
    closingCharacter
    )
{
    code = removeTrailingSpaces( replaceTabs( code ) );

    return (
        getProcessedCode(
            code,
            ( code ) =>
            {
                code = '\b' + code + '\b';

                for ( let characterIndex = 0;
                      characterIndex + 1 < code.length;
                      ++characterIndex )
                {
                    let character = code[ characterIndex ];
                    let nextCharacter = code[ characterIndex + 1 ];

                    if ( ( character === openingCharacter
                           && nextCharacter !== closingCharacter
                           && !isBlankCharacter( nextCharacter ) )
                         || ( nextCharacter === closingCharacter
                              && character !== openingCharacter
                              && !isBlankCharacter( character ) ) )
                    {
                        code
                            = code.slice( 0, characterIndex + 1 )
                              + ' '
                              + code.slice( characterIndex + 1 );
                    }
                }

                return code.slice( 1, -1 );
            }
            )
        );
}

// ~~

function spaceBraces(
    code
    )
{
    return spaceBlocks( code, '{', '}' );
}

// ~~

function spaceBrackets(
    code
    )
{
    return spaceBlocks( code, '[', ']' );
}

// ~~

function spaceParentheses(
    code
    )
{
    return spaceBlocks( code, '(', ')' );
}

// ~~

function spaceCommas(
    code
    )
{
    return spaceBlocks( code, ',', '' );
}

// ~~

function spaceSemicolons(
    code
    )
{
    return spaceBlocks( code, ';', '' );
}

// ~~

function fixEmptyLines(
    code
    )
{
    let lineArray = [];
    let priorLine = '';

    for ( let line of code.split( '\n' ) )
    {
        line = line.trimRight();

        if ( line !== ''
             || priorLine !== '' )
        {
            lineArray.push( line );
        }

        priorLine = line;
    }

    code
        = lineArray
              .join( '\n' )
              .replaceAll( '{\n\n', '{\n' )
              .replaceAll( '[\n\n', '[\n' )
              .replaceAll( '(\n\n', '(\n' )
              .replace( /\n\n( *)\}/g, '\n$1}' )
              .replace( /\n\n( *)\]/g, '\n$1]' )
              .replace( /\n\n( *)\)/g, '\n$1)' );

    lineArray = code.split( '\n' );

    for ( let lineIndex = 0;
          lineIndex < lineArray.length - 1;
          ++lineIndex )
    {
        let line = lineArray[ lineIndex ].trim();
        let nextLine = lineArray[ lineIndex + 1 ].trim();

        if ( line !== ''
             && nextLine !== '' )
        {
            if ( line.startsWith( '// -- ' )
                 || line.startsWith( '// ~~' )
                 || ( line === '}'
                      && nextLine !== 'else'
                      && !nextLine.startsWith( 'else ' )
                      && !nextLine.startsWith( 'while ' )
                      && !nextLine.startsWith( 'catch ' )
                      && !nextLine.startsWith( '}' )
                      && !nextLine.startsWith( ']' )
                      && !nextLine.startsWith( ')' )
                      && !nextLine.startsWith( '<' ) )
                 || ( line !== '{'
                      && ( nextLine.startsWith( '// -- ' )
                           || nextLine.startsWith( '// ~~' )
                           || nextLine.startsWith( 'if ' )
                           || nextLine.startsWith( 'do ' )
                           || ( line !== '}' && nextLine.startsWith( 'while ' ) )
                           || nextLine.startsWith( 'for ' )
                           || nextLine.startsWith( 'try ' )
                           || nextLine == 'try'
                           || ( line !== '}' && nextLine.startsWith( 'catch ' ) )
                           || nextLine.startsWith( 'return ' )
                           || nextLine == 'return' ) ) )
            {
                lineArray.splice( lineIndex + 1, 0, '' );
            }
        }
    }

    return lineArray.join( '\n' );
}

// ~~

function getIdentifierCase(
    identifier
    )
{
    if ( /^[A-Z][A-Z0-9_]+$/.test( identifier ) )
    {
        return 'SCREAM_CASE';
    }
    else if ( /^[A-Z][a-zA-Z0-9]*$/.test( identifier ) )
    {
        return 'PascalCase';
    }
    else if ( /^[a-z][a-z0-9_]*$/.test( identifier ) )
    {
        return 'snake_case';
    }
    else if ( /^[a-z][a-zA-Z0-9]*$/.test( identifier ) )
    {
        return 'camelCase';
    }
    else
    {
        return '';
    }
}

// ~~

function getIdentifierWordArray(
    identifier,
    identifierCase
    )
{
    if ( identifierCase === 'SCREAM_CASE'
         || identifierCase === 'snake_case' )
    {
        return identifier.split( '_' );
    }
    else if ( identifierCase === 'PascalCase'
              || identifierCase === 'camelCase' )
    {
        return identifier.split( /(?=[A-Z])/ ).map( word => word.toLowerCase() );
    }
    else
    {
        return [ identifier ];
    }
}

// ~~

function getFixedIdentifier(
    identifier,
    oldIdentifierCase,
    newIdentifierCase
    )
{
    let identifierWordArray = getIdentifierWordArray( identifier, oldIdentifierCase );

    if ( newIdentifierCase === 'SCREAM_CASE' )
    {
        return identifierWordArray.join( '_' ).toUpperCase();
    }
    else if ( newIdentifierCase === 'PascalCase' )
    {
        return identifierWordArray.map( word => word.charAt( 0 ).toUpperCase() + word.slice( 1 ).toLowerCase() ).join( '' );
    }
    else if ( newIdentifierCase === 'snake_case' )
    {
        return identifierWordArray.join( '_' ).toLowerCase();
    }
    else if ( newIdentifierCase === 'camelCase' )
    {
        return identifierWordArray[ 0 ].toLowerCase() + identifierWordArray.slice( 1 ).map( word => word.charAt( 0 ).toUpperCase() + word.slice( 1 ).toLowerCase() ).join( '' );
    }
    else
    {
        return identifier;
    }
}

// ~~

function fixIdentifiers(
    code
    )
{
    return (
        getProcessedCode(
            code,
            ( code ) =>
            {
                return code.replace(
                    /\w+/g,
                    function( identifier )
                    {
                        let identifierCase = getIdentifierCase( identifier );

                        if ( identifierCase === 'SCREAM_CASE' )
                        {
                            return getFixedIdentifier( identifier, identifierCase, screamCaseIdentifierCase );
                        }
                        else if ( identifierCase === 'PascalCase' )
                        {
                            return getFixedIdentifier( identifier, identifierCase, pascalCaseIdentifierCase );
                        }
                        else if ( identifierCase === 'snake_case' )
                        {
                            return getFixedIdentifier( identifier, identifierCase, snakeCaseIdentifierCase );
                        }
                        else if ( identifierCase === 'camelCase' )
                        {
                            return getFixedIdentifier( identifier, identifierCase, camelCaseIdentifierCase );
                        }
                        else
                        {
                            return identifier;
                        }
                    }
                    );
            }
            )
        );
}

// ~~

function getFixedCode(
    code
    )
{
    code = replaceTabs( code );
    code = removeTrailingSpaces( code );
    code = removeTrailingCommas( code );
    code = splitBraces( code );
    code = splitBrackets( code );
    code = indentBraces( code );
    code = spaceBraces( code );
    code = spaceBrackets( code );
    code = spaceParentheses( code );
    code = fixEmptyLines( code );

    return code;
}

// ~~

function fixCode(
    )
{
    let editor = vscode.window.activeTextEditor;

    if ( editor )
    {
        let document = editor.document;
        let selection = editor.selection;
        let code = document.getText( selection.isEmpty ? undefined : selection );

        code = getFixedCode( code );

        editor.edit(
            ( editBuilder ) =>
            {
                if ( selection.isEmpty )
                {
                    editBuilder.replace(
                        new vscode.Range(
                            new vscode.Position( 0, 0 ),
                            new vscode.Position( document.lineCount + 1, 0 )
                            ),
                        code
                        );
                }
                else
                {
                    editBuilder.replace( selection, code );
                }
            }
            );
    }
}

// ~~

function activate(
    context
    )
{
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "extension.fixCode",
            fixCode
            )
        );
}

// ~~

function deactivate(
    )
{
}

// -- EXPORTS

module.exports =
    {
        activate,
        deactivate
    };
