async function open_files(pickerOpts) {
    const fhs = await window.showOpenFilePicker(pickerOpts);

    return fhs;
}

async function read_ann_file_handle(fh) {
    const file = await fh.getFile();
    const text = await file.text();

    // create ann
    var ann = ann_parser.parse(text);

    // bind the fh
    ann._fh = fh;

    // bind a status
    ann._saved = true;


    return ann;
}