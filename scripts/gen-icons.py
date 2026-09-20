#!/usr/bin/env python3
"""生成 unpackage/res/icons 下的占位图标（纯标准库，无需图像库）。

manifest.json 引用的图标在仓库中缺失，打包前必须补齐。
这里生成与应用主题色一致的占位图：主题色底 + 白色圆环。
"""
import os
import struct
import zlib

BG = (99, 77, 221)      # 与 device_list.vue 中设备卡片主题色一致
FG = (255, 255, 255)

# 文件名 -> 边长，严格对应 manifest.json 中 app-plus.distribute.icons 的引用
ICONS = {
    # android
    '72x72.png': 72,
    '96x96.png': 96,
    '144x144.png': 144,
    '192x192.png': 192,
    # ios
    '20x20.png': 20,
    '29x29.png': 29,
    '40x40.png': 40,
    '58x58.png': 58,
    '60x60.png': 60,
    '76x76.png': 76,
    '80x80.png': 80,
    '87x87.png': 87,
    '120x120.png': 120,
    '152x152.png': 152,
    '167x167.png': 167,
    '180x180.png': 180,
    '1024x1024.png': 1024,
}


def _chunk(tag, data):
    return (struct.pack('>I', len(data)) + tag + data
            + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))


def write_png(path, size, pixels):
    """pixels: list of rows, each a list of (r, g, b)"""
    raw = bytearray()
    for row in pixels:
        raw.append(0)  # filter type 0
        for r, g, b in row:
            raw += bytes((r, g, b))
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)  # 8bit RGB，无 alpha
    png = (b'\x89PNG\r\n\x1a\n'
           + _chunk(b'IHDR', ihdr)
           + _chunk(b'IDAT', zlib.compress(bytes(raw), 9))
           + _chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)


def render(size):
    """主题色底 + 居中白色圆环，边缘做平滑处理"""
    cx = cy = (size - 1) / 2.0
    outer = size * 0.40
    inner = size * 0.28
    rows = []
    for y in range(size):
        row = []
        for x in range(size):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            # 环带内为白色，边缘 1px 渐变，其余为主题色
            if d <= inner:
                t = 1.0
            elif d >= outer:
                t = 0.0
            else:
                edge = min(d - inner, outer - d)
                t = max(0.0, min(1.0, edge))
            row.append(tuple(
                int(round(BG[i] * (1 - t) + FG[i] * t)) for i in range(3)
            ))
        rows.append(row)
    return rows


def main():
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           '..', 'unpackage', 'res', 'icons')
    out_dir = os.path.abspath(out_dir)
    os.makedirs(out_dir, exist_ok=True)
    for name, size in ICONS.items():
        write_png(os.path.join(out_dir, name), size, render(size))
        print('generated %-14s %dx%d' % (name, size, size))


if __name__ == '__main__':
    main()
