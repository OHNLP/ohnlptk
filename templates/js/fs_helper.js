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
    ann._has_saved = true;

    return ann;
}

async function write_ann_file(fh, contents) {
    const writable = await fh.createWritable();
    
    // write the contents
    await writable.write(contents);

    // close the file
    await writable.close();

    return fh;
}

async function get_new_ann_file_handle(fn) {
    const options = {
    suggestedName: fn,
      types: [
        {
          description: 'Text Files',
          accept: {
            'text/xml': ['.xml'],
          },
        },
      ],
    };
    const handle = await window.showSaveFilePicker(options);
    return handle;
  }