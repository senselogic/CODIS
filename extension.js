// -- IMPORTS

const vscode = require( 'vscode' );

// -- VARIABLES

var
    indentation = '    ';

// -- FUNCTIONS

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

function replaceTabs(
    code
    )
{
    return code.replaceAll( '\t', indentation );
}

// ~~

function removeTrailingSpaces(
    code
    )
{
    return (
        code
            .replace(
                /[ \t]+$/gm,
                ''
                )
        );
}

// ~~

function splitBraces(
    code
    )
{
    code = removeTrailingSpaces( code );

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
                    else
                    {
                        return indentation + '}\n' + indentation + code;
                    }
                }
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

function splitBrackets(
    code
    )
{
    code = removeTrailingSpaces( code );

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
        let trimmedLine = line.trimLeft();

        lineArray[ lineIndex ] = line;

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
        level = levelArray[ lineIndex ];

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
            if ( ( line.startsWith( '// -- ' )
                   || line.startsWith( '// ~~' )
                   || ( line === '}'
                        && nextLine !== 'else'
                        && !nextLine.startsWith( 'else ' )
                        && !nextLine.startsWith( '}' )
                        && !nextLine.startsWith( ']' )
                        && !nextLine.startsWith( ')' )
                        && !nextLine.startsWith( '<' ) ) )
                 || ( line !== '{'
                      && ( nextLine.startsWith( '// -- ' )
                           || nextLine.startsWith( '// ~~' )
                           || nextLine.startsWith( 'if ' )
                           || nextLine.startsWith( 'do ' )
                           || ( line !== '}'
                                && nextLine.startsWith( 'while ' ) )
                           || nextLine.startsWith( 'for ' )
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
            () =>
            {
                fixCode();
            }
            )
        );
}

// -- EXPORTS

exports.activate = activate;
