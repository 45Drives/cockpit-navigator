(function (root, data) {
    var loaded, module;

    /* Load into AMD if desired */
    if (typeof define === 'function' && define.amd) {
        define(data);
        loaded = true;
    }

    /* Load into Cockpit locale */
    if (typeof cockpit === 'object') {
        cockpit.locale(data)
        loaded = true;
    }

    function transformAngular(data, prev) {
        var key, context, parts, value, result = { };
        for (key in data) {
            if (key === "")
                continue;
            parts = key.split("\u0004");
            value = data[key];
            if (parts[1]) {
                context = parts[0];
                key = parts[1];
            } else {
                context = "$$noContext";
                key = parts[0];
            }
            if (value[0] === null)
                value = value[1];
            else
                value = value.slice(1);
            if (!(key in result))
                result[key] = { };
            result[key][context] = value;
        }
        return angular.extend(prev, result);
    }

    /* Load into angular here */
    if (typeof angular === 'object') {
        try {
            module = angular.module(["gettext"]);
        } catch(ex) { console.log(ex); /* Either no angular or angular-gettext */ };
        if (module) {
            loaded = true;
            module.run(['gettextCatalog', function(gettextCatalog) {
                var lang = data[""]["language"];
                var prev = (gettextCatalog.getCurrentLanguage() == lang) ? gettextCatalog.strings : { };
                gettextCatalog.setStrings(lang, transformAngular(data, prev));
                gettextCatalog.setCurrentLanguage(lang);
            }]);
        }
    }

    if (!loaded)
        root.po = data;

}(this, {
 "": {'plural-forms':function(n) {
 var nplurals, plural;
 nplurals=1; plural=0;
 return plural;
 },
  "language": "zh_CN",
  "x-generator": "Zanata 4.6.2"
 },
 "Navigator": [
  null,
  "文件管理"
 ],
 "Back": [
  null,
  "后退"
 ],
 "Forward": [
  null,
  "前进"
 ],
 "Up": [
  null,
  "上级目录"
 ],
 "Refresh": [
  null,
  "刷新"
 ],
 "Navigation Bar": [
  null,
  "地址栏"
 ],
 "Prepend * to fuzzy search": [
  null,
  "使用*进行模糊搜索"
 ],
 "New Directory": [
  null,
  "新建目录"
 ],
 "New File": [
  null,
  "新建文件"
 ],
 "New Symbolic Link": [
  null,
  "新建符号链接"
 ],
 "Upload File(s)": [
  null,
  "上传文件"
 ],
 "Name": [
  null,
  "名称"
 ],
 "Mode": [
  null,
  "模式"
 ],
 "Owner": [
  null,
  "所有者"
 ],
 "Group": [
  null,
  "组"
 ],
 "Size": [
  null,
  "大小"
 ],
 "Modified": [
  null,
  "修改于"
 ],
 "Created": [
  null,
  "创建于"
 ],
 "Cancel": [
  null,
  "取消"
 ],
 "Save": [
  null,
  "保存"
 ],
 "Delete": [
  null,
  "删除"
 ],
 "Edit Properties": [
  null,
  "编辑属性"
 ],
 "Edit Contents": [
  null,
  "编辑内容"
 ],
 "Read": [
  null,
  "读"
 ],
 "Write": [
  null,
  "写"
 ],
 "Execute": [
  null,
  "执行"
 ],
 "Other": [
  null,
  "其他"
 ],
 "Save Changes": [
  null,
  "保存变更"
 ],
 "Show Hidden Files": [
  null,
  "显示隐藏文件"
 ],
 "Toggle Dark/Light": [
  null,
  "切换深色/浅色"
 ],
 "Uploading": [
  null,
  "正在上传"
 ],
 "Failed to read file: ${filename}": [
  null,
  "读取文件失败: ${filename}"
 ],
 "Upload of directories not supported.": [
  null,
  "不支持上传目录。"
 ],
 "Upload of directories and empty files not supported.": [
  null,
  "不支持上传目录和空文件。"
 ],
 "OK": [
  null,
  "确认"
 ],
 "Yes": [
  null,
  "是"
 ],
 "No": [
  null,
  "否"
 ],
 "Cut": [
  null,
  "剪切"
 ],
 "Copy": [
  null,
  "复制"
 ],
 "Paste": [
  null,
  "粘贴"
 ],
 "Download": [
  null,
  "下载"
 ],
 "Properties": [
  null,
  "属性"
 ],
 "Cannot rename system-critical paths": [
  null,
  "无法重命名系统关键路径"
 ],
 "If you think you need to, use the terminal.": [
  null,
  "如果您认为需要，请使用终端。"
 ],
 "WARNING: '$0' is not empty": [
  null,
  "警告: '$0'不为空"
 ],
 "Delete recursively? This can NOT be undone.": [
  null,
  "递归删除吗？这是无法撤消的。"
 ],
 "Ceph Status": [
  null,
  "Ceph状态"
 ],
 "Link Target": [
  null,
  "链接目标"
 ],
 "Copy whole directory: ${fullPath}?": [
  null,
  "复制整个目录: ${fullPath}?"
 ],
 "Conflicts found while uploading. Replace?": [
  null,
  "上传过程中发生冲突。取代吗？"
 ],
 "File name can't contain `/`": [
  null,
  "文件名不能包含`/`"
 ],
 "If you want to move the file, right click > cut then right click > paste.": [
  null,
  "如果要移动文件，单击右键 > 剪切，然后单击右键 > 粘贴。"
 ],
 "File name can't be `..`": [
  null,
  "文件名不能为`..`"
 ],
 "Failed to rename": [
  null,
  "重命名失败"
 ],
 "File exists: ${path}": [
  null,
  "文件存在: ${path}"
 ],
 "Accessed": [
  null,
  "访问于"
 ],
 "'${filename}' is not a text file. Open it anyway?": [
  null,
  "'${filename}'不是文本文件。仍然要打开它吗？"
 ],
 "WARNING: this may lead to file corruption.": [
  null,
  "警告：这可能会导致文件损坏。"
 ],
 "Editing": [
  null,
  "正在编辑"
 ],
 "Unknown mimetype: $0": [
  null,
  "未知的mimetype: $0"
 ],
 "Can't open ${filename} for editing": [
  null,
  "无法打开${filename}进行编辑"
 ],
 "1 Directory": [
  null,
  "1个目录"
 ],
 "$0 Directories": [
  null,
  "$0个目录"
 ],
 "1 File": [
  null,
  "1个文件"
 ],
 "$0 Files": [
  null,
  "$0个文件"
 ],
 "$0 selected": [
  null,
  "选中了$0个对象"
 ],
 "Warning: editing $0 can be dangerous": [
  null,
  "警告：编辑 $0 可能很危险"
 ],
 "Are you sure?": [
  null,
  "你确定吗？"
 ],
 "Warning: editing permissions for $0 files": [
  null,
  "警告: $0 文件的编辑权限"
 ],
 "Applying edits to": [
  null,
  "将编辑应用于"
 ],
 "unchanged": [
  null,
  "未改变"
 ],
 "Deleting ${num} files": [
  null,
  "删除${num}个文件"
 ],
 "Deleting `${filePath}`": [
  null,
  "删除文件`${filePath}`"
 ],
 "This cannot be undone. Are you sure?": [
  null,
  "这是无法撤消的。是否确定？"
 ],
 "Creating Directory": [
  null,
  "创建目录"
 ],
 "Directory name can't be empty.": [
  null,
  "目录名称不能为空"
 ],
 "Directory name can't contain `/`.": [
  null,
  "目录名称不能包含`/`"
 ],
 "Creating File": [
  null,
  "创建文件"
 ],
 "File name can't be empty.": [
  null,
  "文件名不能为空"
 ],
 "File name can't contain `/`.": [
  null,
  "文件名不能包含`/`"
 ],
 "Creating Symbolic Link": [
  null,
  "创建符号链接"
 ],
 "Target": [
  null,
  "目标"
 ],
 "Link target can't be empty.": [
  null,
  "链接目标不能为空"
 ],
 "Link name can't be empty.": [
  null,
  "链接名不能为空"
 ],
 "Link name can't contain `/`.": [
  null,
  "链接名不能包含`/`"
 ],
 "Overwrite?": [
  null,
  "覆盖？"
 ],
 "Paste failed.": [
  null,
  "粘贴失败"
 ],
 "Cannot $0 system-critical paths.": [
  null,
  "不能$0系统关键路径"
 ],
 "The following path(s) are very dangerous to $0: $1. If you think you need to $0 them, use the terminal.": [
  null,
  "以下路径对$0非常危险: $1。如果您认为您需要$0它们，请使用终端。"
 ]
}));
