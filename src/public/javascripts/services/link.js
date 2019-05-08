import treeService from './tree.js';
import treeUtils from './tree_utils.js';
import contextMenuService from "./context_menu.js";
import noteDetailService from "./note_detail.js";

function getNotePathFromUrl(url) {
    const notePathMatch = /#(root[A-Za-z0-9/]*)$/.exec(url);

    if (notePathMatch === null) {
        return null;
    }
    else {
        return notePathMatch[1];
    }
}

async function createNoteLink(notePath, noteTitle = null) {
    if (!noteTitle) {
        const noteId = treeUtils.getNoteIdFromNotePath(notePath);

        noteTitle = await treeUtils.getNoteTitle(noteId);
    }

    const noteLink = $("<a>", {
        href: 'javascript:',
        text: noteTitle
    }).attr('data-action', 'note')
        .attr('data-note-path', notePath);

    return noteLink;
}

function getNotePathFromLink($link) {
    const notePathAttr = $link.attr("data-note-path");

    if (notePathAttr) {
        return notePathAttr;
    }

    const url = $link.attr('href');

    return url ? getNotePathFromUrl(url) : null;
}

function goToLink(e) {
    e.preventDefault();

    const $link = $(e.target);

    const notePath = getNotePathFromLink($link);

    if (notePath) {
        if (e.ctrlKey) {
            noteDetailService.loadNoteDetail(notePath.split("/").pop(), true);
        }
        else {
            treeService.activateNote(notePath);
        }
    }
    else {
        const address = $link.attr('href');

        if (address && address.startsWith('http')) {
            window.open(address, '_blank');
        }
    }
}

function addLinkToEditor(linkTitle, linkHref) {
    const editor = noteDetailService.getActiveComponent().getEditor();

    editor.model.change( writer => {
        const insertPosition = editor.model.document.selection.getFirstPosition();
        writer.insertText(linkTitle, { linkHref: linkHref }, insertPosition);
    });
}

function addTextToEditor(text) {
    const editor = noteDetailService.getActiveComponent().getEditor();

    editor.model.change(writer => {
        const insertPosition = editor.model.document.selection.getFirstPosition();
        writer.insertText(text, insertPosition);
    });
}

function init() {
    ko.bindingHandlers.noteLink = {
        init: async function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            const noteId = ko.unwrap(valueAccessor());

            if (noteId) {
                const link = await createNoteLink(noteId);

                $(element).append(link);
            }
        }
    };
}

function tabContextMenu(e) {
    const $link = $(e.target);

    const notePath = getNotePathFromLink($link);

    if (!notePath) {
        return;
    }

    e.preventDefault();

    contextMenuService.initContextMenu(e, {
        getContextMenuItems: () => {
            return [
                {title: "Open note in new tab", cmd: "openNoteInNewTab", uiIcon: "empty"}
            ];
        },
        selectContextMenuItem: (e, cmd) => {
            if (cmd === 'openNoteInNewTab') {
                noteDetailService.loadNoteDetail(notePath.split("/").pop(), true);
            }
        }
    });
}

$(document).on('contextmenu', '.note-detail-text a', tabContextMenu);
$(document).on('contextmenu', "a[data-action='note']", tabContextMenu);
$(document).on('contextmenu', ".note-detail-render a", tabContextMenu);

// when click on link popup, in case of internal link, just go the the referenced note instead of default behavior
// of opening the link in new window/tab
$(document).on('click', "a[data-action='note']", goToLink);
$(document).on('click', 'div.popover-content a, div.ui-tooltip-content a', goToLink);
$(document).on('dblclick', '.note-detail-text a', goToLink);
$(document).on('click', '.note-detail-text a', function (e) {
    const notePath = getNotePathFromLink($(e.target));
    if (notePath && e.ctrlKey) {
        // if it's a ctrl-click, then we open on new tab, otherwise normal flow (CKEditor opens link-editing dialog)
        e.preventDefault();

        noteDetailService.loadNoteDetail(notePath.split("/").pop(), true);
    }
});

$(document).on('click', '.note-detail-render a', goToLink);
$(document).on('click', '.note-detail-text.ck-read-only a', goToLink);
$(document).on('click', 'span.ck-button__label', e => {
    // this is a link preview dialog from CKEditor link editing
    // for some reason clicked element is span

    const url = $(e.target).text();
    const notePath = getNotePathFromUrl(url);

    if (notePath) {
        treeService.activateNote(notePath);

        e.preventDefault();
    }
});

export default {
    getNotePathFromUrl,
    createNoteLink,
    addLinkToEditor,
    addTextToEditor,
    init
};