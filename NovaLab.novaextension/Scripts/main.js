let langserver = null;

exports.activate = function() {
    // Do work when the extension is activated
    langserver = new LangServer();
}

exports.deactivate = function() {
    // Clean up state before the extension is deactivated
    if (langserver) {
        langserver.deactivate();
        langserver = null;
    }
}


nova.commands.register("novalab.undoLastSelection", (editor) => {
    const oldRanges = editor.selectedRanges;
    const primaryRange = editor.selectedRange;
    
    let newRanges;
    
    if (oldRanges.length === 1) {
        newRanges = [ new Range(primaryRange.start, primaryRange.start) ];
    } else {
        const primaryRangeIndex = oldRanges.findIndex(
            (range) => range.isEqual(primaryRange)
        );
        newRanges = (
            primaryRangeIndex === 0
            ? oldRanges.slice(0, oldRanges.length - 1)
            : [
                ...oldRanges.slice(primaryRangeIndex, oldRanges.length),
                ...oldRanges.slice(0, primaryRangeIndex - 1)
              ]
        );
        editor.scrollToPosition(newRanges[newRanges.length - 1].end);
    }
    
    editor.selectedRanges = newRanges;
});


const better = require('better-title-case.js');

nova.commands.register("novalab.toTitleCase", (editor) => {
    editor.selectWordsContainingCursors();
    const ranges = editor.selectedRanges;
    editor.edit(function(e) {
        for (const range of ranges) {
            e.replace(range, better.titleCase(editor.getTextInRange(range), {
                preserveWhitespace: true
            }));
        }
    });
});


nova.commands.register("novalab.git-difftool", (workspace) => {
    const path = workspace.path;
    const showMessage = (message) => nova.workspace.showWarningMessage("🧐 " + message);
    
    if (path) {
        let process = new Process("/usr/bin/git", {
            args: ["difftool", "--gui"],
            cwd: path
        });
        process.onStderr( (line) => console.error(line) );
        process.onDidExit( (status) => {
            if (status) {
                showMessage(`Looks like there’s no Git repository here:\n${path}\n[${status}]`);
            }
        });
        process.start();
    } else {
        showMessage("Looks like this workspace has no path.");
    }
});


class LangServer {
    constructor() {
        // Observe the configuration settings for the server, and restart the server on change
        nova.workspace.config.observe("novalab.ls-activate", () => this.start(), this);
        nova.workspace.config.onDidChange("novalab.ls-path", () => this.start(), this);
        nova.workspace.config.onDidChange("novalab.ls-args", () => this.start(), this);
        nova.workspace.config.onDidChange("novalab.ls-synt", () => this.start(), this);
    }
    
    deactivate() {
        this.stop();
    }
    
    start() {
        if (this.languageClient) {
            this.languageClient.stop();
            nova.subscriptions.remove(this.languageClient);
        }
        
        const bool = nova.workspace.config.get("novalab.ls-activate", "boolean");
        const path = nova.workspace.config.get("novalab.ls-path", "string")?.trim();
        const syntaxes = getSyntaxes(nova.workspace);
        
        if (bool && path && syntaxes.length) {
            const args = [
                path,
                ...nova.workspace.config.get("novalab.ls-args", "array")
            ];
            
            console.log(
                `Starting server "/usr/bin/env ${args.join(" ")}" for ${syntaxes.length} syntax${syntaxes.length > 1 ? "es" : ""}: ${syntaxes.map((el) => `"${el}"`).join(", ")}`
            );
            
            // Create the client
            const serverOptions = {
                path: "/usr/bin/env",
                args: args
            };
            const clientOptions = {
                // The set of document syntaxes for which the server is valid
                syntaxes: syntaxes
            };
            const client = new LanguageClient("novalab.langserver", "NovaLab Language Server", serverOptions, clientOptions);
            
            try {
                // Start the client
                client.start();
                
                // Add the client to the subscriptions to be cleaned up
                nova.subscriptions.add(client);
                this.languageClient = client;
            }
            catch (err) {
                // If the .start() method throws, it’s likely because the path to the language server is invalid
                console.error(err);
            }
        }
    }
    
    stop() {
        if (this.languageClient) {
            this.languageClient.stop();
            nova.subscriptions.remove(this.languageClient);
            this.languageClient = null;
        }
    }
}

function getSyntaxes(workspace) {
    return workspace.config.get("novalab.ls-synt", "array")
    ?.map((element) => element.trim())
    .filter(Boolean)
    .filter((element, index, array) => array.indexOf(element) === index)
    || [];
}

function setSyntaxes(workspace) {
    const syntaxes = getSyntaxes(workspace);
    
    new Set(
        workspace.textEditors
        .map((editor) => editor.document.syntax)
    )
    .forEach((syntax) => {
        if (syntax && !syntaxes.includes(syntax)) {
            syntaxes.push(syntax);
        }
    });
    
    workspace.config.set("novalab.ls-synt", syntaxes);
}

nova.commands.register("novalab.setSyntaxes", setSyntaxes);
