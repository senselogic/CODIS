// -- IMPORTS

const vscode = require( 'vscode' );

// -- VARIABLES

var
    indentation = '    ';

// -- FUNCTIONS

function getLineLevel(
    line
    )
{
    var
        level;

    level = 0;

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
    var
        levelIndentation;

    levelIndentation = "";

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
    return code.replaceAll( "\t", indentation );
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
                    if ( code === "" )
                    {
                        return indentation + "{";
                    }
                    else
                    {
                        return indentation + code + "\n" + indentation + "{";
                    }
                }
                )
            .replace(
                /^( *)\} *else$/gm,
                function ( match, indentation )
                {
                    return indentation + "}\n" + indentation + "else";
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
                        return indentation + "}\n" + indentation + code;
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
                    return indentation + code + "\n" + indentation + "[";
                }
                )
            .replace(
                /^( *)\] *\)(.*)$/gm,
                function ( match, indentation, code )
                {
                    return indentation + "]\n" + indentation + ")" + code;
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
                ""
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
                ""
                )
        );
}

// ~~

function indentBraces(
    code
    )
{
    var
        addedIndentation,
        level,
        levelArray,
        levelIndentation,
        line,
        lineArray,
        lineIndentation,
        lineIndex,
        nextLevel,
        nextLevelArray,
        nextLine,
        nextLineIndex,
        trimmedLine;

    lineArray = code.split( "\n" );

    levelArray = [];
    nextLevelArray = [];
    level = 0;

    for ( lineIndex = 0;
          lineIndex < lineArray.length;
          ++lineIndex )
    {
        line = lineArray[ lineIndex ].trimRight();

        if ( line !== "" )
        {
            level = getLineLevel( line );

            break;
        }
    }

    for ( lineIndex = 0;
          lineIndex < lineArray.length;
          ++lineIndex )
    {
        line = lineArray[ lineIndex ].trimRight();
        trimmedLine = line.trimLeft();

        lineArray[ lineIndex ] = line;

        nextLevel = level;

        while ( trimmedLine.endsWith( "(" )
                || trimmedLine.endsWith( "[" )
                || trimmedLine.endsWith( "{" ) )
        {
            ++nextLevel;

            trimmedLine = trimmedLine.slice( 0, -1 );
        }

        while ( trimmedLine.startsWith( ")" )
                || trimmedLine.startsWith( "]" )
                || trimmedLine.startsWith( "}" ) )
        {
            --nextLevel;

            if ( trimmedLine.startsWith( "}" ) )
            {
                --level;
            }

            trimmedLine = trimmedLine.slice( 1 );
        }

        levelArray.push( level );
        nextLevelArray.push( nextLevel );
        level = nextLevel;
    }

    for ( lineIndex = 0;
          lineIndex < lineArray.length;
          ++lineIndex )
    {
        line = lineArray[ lineIndex ];
        level = levelArray[ lineIndex ];

        lineIndentation = getLineIndentation( line );
        levelIndentation = getLevelIndentation( level );

        if ( lineIndentation.length < levelIndentation.length )
        {
            addedIndentation = levelIndentation.slice( 0, levelIndentation.length - lineIndentation.length );

            for ( nextLineIndex = lineIndex;
                  nextLineIndex < lineArray.length;
                  ++nextLineIndex )
            {
                nextLine = lineArray[ nextLineIndex ];
                nextLevel = levelArray[ nextLineIndex ];

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

    return lineArray.join( "\n" );
}

// ~~

function isBlankCharacter(
    character
    )
{
    return (
        character === ""
        || character === " "
        || character === "\t"
        || character === "\r"
        || character === "\n"
        );
}

// ~~

function spaceBlocks(
    code,
    openingCharacter,
    closingCharacter
    )
{
    var
        character,
        characterIndex,
        literalCharacter,
        nextCharacter,
        priorCode;

    code = removeTrailingSpaces( replaceTabs( code ) );

    literalCharacter = "";

    for ( characterIndex = 0;
          characterIndex + 1 < code.length;
          ++characterIndex )
    {
        character = code[ characterIndex ];
        nextCharacter = code[ characterIndex + 1 ];

        if ( character === '\n'
             && literalCharacter !== "`" )
        {
            literalCharacter = "";
        }

        if ( literalCharacter !== "" )
        {
            if ( character === "\\" )
            {
                ++characterIndex;
            }
            else if ( character === literalCharacter )
            {
                literalCharacter = "";
            }
        }
        else if ( character === "/"
                  && nextCharacter === "/" )
        {
            characterIndex += 2;

            while ( characterIndex < code.length
                    && code[ characterIndex ] !== '\n' )
            {
                ++characterIndex;
            }
        }
        else if ( character === "/"
                  && nextCharacter === "*" )
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
            if ( character === "/"
                 && nextCharacter !== "/" )
            {
                priorCode = code.slice( 0, characterIndex ).trimRight();

                if ( priorCode === ""
                     || priorCode.endsWith( "=" )
                     || priorCode.endsWith( "<" )
                     || priorCode.endsWith( ">" )
                     || priorCode.endsWith( "+" )
                     || priorCode.endsWith( "-" )
                     || priorCode.endsWith( "*" )
                     || priorCode.endsWith( "/" )
                     || priorCode.endsWith( "%" )
                     || priorCode.endsWith( "^" )
                     || priorCode.endsWith( "~" )
                     || priorCode.endsWith( "&" )
                     || priorCode.endsWith( "|" )
                     || priorCode.endsWith( "!" )
                     || priorCode.endsWith( "?" )
                     || priorCode.endsWith( ":" )
                     || priorCode.endsWith( "(" )
                     || priorCode.endsWith( "[" )
                     || priorCode.endsWith( "{" )
                     || priorCode.endsWith( ";" )
                     || priorCode.endsWith( "," )
                     || priorCode.endsWith( " return" )
                     || priorCode.endsWith( "\treturn" )
                     || priorCode.endsWith( "\rreturn" )
                     || priorCode.endsWith( "\nreturn" )
                     || priorCode === "return" )
                {
                    literalCharacter = "/";

                    continue;
                }
            }

            if ( character === "'"
                 || character === "\""
                 || character === "`" )
            {
                literalCharacter = character;
            }
            else
            {
                if ( ( character === openingCharacter
                       && nextCharacter !== closingCharacter
                       && !isBlankCharacter( nextCharacter ) )
                     || ( nextCharacter === closingCharacter
                          && character !== openingCharacter
                          && !isBlankCharacter( character ) ) )
                {
                    code
                        = code.slice( 0, characterIndex + 1 )
                          + " "
                          + code.slice( characterIndex + 1 );
                }
            }
        }
    }

    return code;
}

// ~~

function spaceBraces(
    code
    )
{
    return spaceBlocks( code, "{", "}" );
}

// ~~

function spaceBrackets(
    code
    )
{
    return spaceBlocks( code, "[", "]" );
}

// ~~

function spaceParentheses(
    code
    )
{
    return spaceBlocks( code, "(", ")" );
}

// ~~

function fixEmptyLines(
    code
    )
{
    var
        line,
        lineArray,
        lineIndex,
        nextLine,
        priorLine;

    lineArray = [];
    priorLine = "";

    for ( line of code.split( "\n" ) )
    {
        line = line.trimRight();

        if ( line !== ""
             || priorLine !== "" )
        {
            lineArray.push( line );
        }

        priorLine = line;
    }

    code
        = lineArray
              .join( "\n" )
              .replaceAll( "{\n\n", "{\n" )
              .replaceAll( "[\n\n", "[\n" )
              .replaceAll( "(\n\n", "(\n" )
              .replace( /\n\n( *)\}/g, "\n$1}" )
              .replace( /\n\n( *)\]/g, "\n$1]" )
              .replace( /\n\n( *)\)/g, "\n$1)" );

    lineArray = code.split( "\n" );

    for ( lineIndex = 0;
          lineIndex < lineArray.length - 1;
          ++lineIndex )
    {
        line = lineArray[ lineIndex ].trim();
        nextLine = lineArray[ lineIndex + 1 ].trim();

        if ( line !== ""
             && nextLine !== "" )
        {
            if ( ( line.startsWith( "// -- " )
                   || line.startsWith( "// ~~" )
                   || ( line === "}"
                        && nextLine !== "else"
                        && !nextLine.startsWith( "else " )
                        && !nextLine.startsWith( "}" )
                        && !nextLine.startsWith( "]" )
                        && !nextLine.startsWith( ")" )
                        && !nextLine.startsWith( "<" ) ) )
                 || ( line !== "{"
                      && ( nextLine.startsWith( "// -- " )
                           || nextLine.startsWith( "// ~~" )
                           || nextLine.startsWith( "if " )
                           || nextLine.startsWith( "do " )
                           || ( line !== "}"
                                && nextLine.startsWith( "while " ) )
                           || nextLine.startsWith( "for " )
                           || nextLine.startsWith( "return " )
                           || nextLine == "return" ) ) )
            {
                lineArray.splice( lineIndex + 1, 0, "" );
            }
        }
    }

    return lineArray.join( "\n" );
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
            () =>
            {
                fixCode();
            }
            )
        );
}

// -- EXPORTS

exports.activate = activate;
