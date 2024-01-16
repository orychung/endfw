"use strict";
// library to add feature to built-in types
// must include common/builtin.js

// custom
{
  // modified from https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle
  async function* getFilesRecursively(entry, path='') {
    if (entry.kind === "file") {
      const file = await entry.getFile();
      if (file !== null) {
        file.relativePath = (path+'/'+entry.name).slice(1);
        yield file;
      }
    } else if (entry.kind === "directory") {
      for await (const handle of entry.values()) {
        yield* getFilesRecursively(handle, path+'/'+entry.name);
      }
    }
  }
  DataTransferItem.defineMethod("getAsFiles", async function* getAsFiles() {
    yield* getFilesRecursively(await this.getAsFileSystemHandle());
  });
  Object.defineProperty(DataTransferItem.prototype, "files", {
    get() { return Array.fromAsync(this.getAsFiles()); }
  });
};
