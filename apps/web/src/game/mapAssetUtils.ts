export function resolveMapAsset(owner: string, relative: string): string {
  const parts = owner.replaceAll('\\', '/').split('/');
  parts.pop();
  for (const part of relative.replaceAll('\\', '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..' && parts.length && parts.at(-1) !== '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

export function decodeTileGid(value: number) {
  return { gid: (value & 0x0fffffff) >>> 0, flipX: !!(value & 0x80000000), flipY: !!(value & 0x40000000) };
}
