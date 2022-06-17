/**
 * @typedef {Object} NavigatorSettings
 * @property {Object} directoryView - Settings for directory view
 * @property {String} directoryView.view - 'list' - list view, otherwise grid view
 * @property {Boolean} directoryView.showHidden - show/hide entries starting with '.'
 * @property {Boolean} directoryView.separateDirs - separate or interleave files and directories while sorting
 * @property {Object} directoryView.cols - Booleans of whether or not to show columns in list view
 * @property {Boolean} directoryView.cols.mode - Show the mode column
 * @property {Boolean} directoryView.cols.owner - Show the owner column
 * @property {Boolean} directoryView.cols.group - Show the group column
 * @property {Boolean} directoryView.cols.size - Show the size column
 * @property {Boolean} directoryView.cols.btime - Show the creation time column
 * @property {Boolean} directoryView.cols.mtime - Show the modification time column
 * @property {Boolean} directoryView.cols.atime - Show the access time column
 * @property {Object} searchInDirectory - Settings for filtering directory entries
 * @property {Boolean} searchInDirectory.ignoreCase - false: case sensitive, true: case insensitive
 * @property {Boolean} searchInDirectory.fullRegex - false: glob matching, true: full regex mode
 */

/**
 * @callback ErrorCallback
 * @param {Error} error - The error to handle
 */

/**
 * @template T
 * @typedef {Object} Ref
 * @property {T} value
 */
