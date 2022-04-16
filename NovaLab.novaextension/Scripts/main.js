exports.activate = function() {
    // Do work when the extension is activated
    nova.assistants.registerTaskAssistant(new NovaLabTasks(), {
        identifier: NovaLabTasks.identifier
    });
}

exports.deactivate = function() {
    // Clean up state before the extension is deactivated
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


class NovaLabTasks {
    static identifier = "novalab.tasks";
    
    constructor() {
        nova.config.onDidChange("novalab.task",
            () => nova.workspace.reloadTasks(NovaLabTasks.identifier)
        );
    }
    
    provideTasks() {
        if (nova.config.get("novalab.task", "boolean")) {
            let task = new Task("NovaLab Assistant");
            task.setAction(Task.Run, new TaskResolvableAction());
            return [task];
        }
    }
    
    resolveTaskAction(context) {
        console.log("Resolving...");
        const lines = [
            "NovaLab Task " + (context.config ? "Template" : "Assistant"),
            "ExtensionFolder = $ExtensionFolder",
            "File = $File",
            "FileRelative = $FileRelative",
            "FileBasename = $FileBasename",
            "FileDirname = $FileDirname",
            "FileExtname = $FileExtname",
            "LineNumber = $LineNumber",
            "novalab.getLnCol = ${Command:novalab.getLnCol}",
            "novalab.getFilenameWithoutExt = ${Command:novalab.getFilenameWithoutExt}",
            "${Command:novalab.splitextDebug}",
            "\nhttps://docs.nova.app/api-reference/path/#splitextpath says that\nsplitext(path) splits the path into an array with two components:\nthe path + filename without the extension, and the file extension.",
        ];
        return new TaskProcessAction("/bin/echo", { args: [lines.join("\n")] });
    }
}

function getLnCol(editor) {
    // Returns [Ln, Col] coordinates of start position of selected range in editor.
    const lines = editor
        .getTextInRange(new Range(0, editor.selectedRange.start))
        .split(editor.document.eol);
    return [
        lines.length,
        lines[lines.length - 1].length + 1
    ];
}

nova.commands.register("novalab.getLnCol", (workspace) => {
    const editor = workspace.activeTextEditor;
    return editor ? getLnCol(editor).join(",") : undefined;
});

nova.commands.register("novalab.getFilenameWithoutExt", (workspace) => {
    let path = workspace.activeTextEditor?.document.path;
    if (typeof path === "string") {
        const lastIndexOfSlash = path.lastIndexOf("/");
        const indexOfExt = path.indexOf(".", lastIndexOfSlash);
        if (indexOfExt > lastIndexOfSlash + 1) {
            path = path.substring(0, indexOfExt);
        }
    }
    return path;
});

nova.commands.register("novalab.splitextDebug", (workspace) => {
    const path = workspace.activeTextEditor?.document.path;
    return "nova.path.splitext" + (path ? (`(${path}) = ` + nova.path.splitext(path)) : "() = ");
});
