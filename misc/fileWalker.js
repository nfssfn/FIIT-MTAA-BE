const { resolve } = require('path');
const { readdir } = require('fs').promises;

module.exports = async function walk(dir) {
  const dirs = await readdir(dir, { withFileTypes: true });

  const files = await Promise.all(dirs.map((curDir) => {
    const path = resolve(dir, curDir.name);
    return curDir.isDirectory() ? walk(path) : path;
  }));

  return files.flat();
}