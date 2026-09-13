#!/usr/bin/env node

import { open } from "node:fs/promises";
import path from "node:path";

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  throw new Error("Usage: node colmap-textured-ply-to-obj.mjs <mesh.ply> <mesh.obj>");
}

const inputPath = path.resolve(inputArg);
const outputPath = path.resolve(outputArg);
const file = await open(inputPath, "r");
const output = await open(outputPath, "w");

try {
  const probe = Buffer.alloc(8192);
  const { bytesRead } = await file.read(probe, 0, probe.length, 0);
  const headerProbe = probe.subarray(0, bytesRead);
  const headerMarker = headerProbe.includes(Buffer.from("end_header\r\n"))
    ? Buffer.from("end_header\r\n")
    : Buffer.from("end_header\n");
  const headerEnd = headerProbe.indexOf(headerMarker);
  if (headerEnd === -1) throw new Error("PLY header is larger than expected or invalid");

  const headerLength = headerEnd + headerMarker.length;
  const header = probe.subarray(0, headerLength).toString("ascii");
  if (!header.includes("format binary_little_endian 1.0")) {
    throw new Error("Only COLMAP binary little-endian PLY files are supported");
  }

  const vertexCount = Number(header.match(/element vertex (\d+)/)?.[1]);
  const faceCount = Number(header.match(/element face (\d+)/)?.[1]);
  if (!Number.isInteger(vertexCount) || !Number.isInteger(faceCount)) {
    throw new Error("PLY vertex or face count is missing");
  }

  const stat = await file.stat();
  const body = Buffer.alloc(stat.size - headerLength);
  await file.read(body, 0, body.length, headerLength);
  let offset = 0;
  let lines = ["# Converted from a COLMAP textured PLY", "o reconstruction"];
  const flush = async () => {
    if (lines.length === 0) return;
    await output.write(`${lines.join("\n")}\n`);
    lines = [];
  };

  for (let index = 0; index < vertexCount; index += 1) {
    const x = body.readFloatLE(offset);
    const y = body.readFloatLE(offset + 4);
    const z = body.readFloatLE(offset + 8);
    offset += 12;
    lines.push(`v ${x} ${y} ${z}`);
    if (lines.length >= 10_000) await flush();
  }

  let textureIndex = 1;
  for (let index = 0; index < faceCount; index += 1) {
    const cornerCount = body.readUInt8(offset);
    offset += 1;
    const vertices = [];
    for (let corner = 0; corner < cornerCount; corner += 1) {
      vertices.push(body.readInt32LE(offset) + 1);
      offset += 4;
    }

    const coordinateCount = body.readUInt8(offset);
    offset += 1;
    if (coordinateCount !== cornerCount * 2) {
      throw new Error(`Unexpected texture coordinate count in face ${index}`);
    }
    const textureIndices = [];
    for (let corner = 0; corner < cornerCount; corner += 1) {
      const u = body.readFloatLE(offset);
      const v = body.readFloatLE(offset + 4);
      offset += 8;
      lines.push(`vt ${u} ${v}`);
      textureIndices.push(textureIndex);
      textureIndex += 1;
    }
    lines.push(`f ${vertices.map((vertex, corner) => `${vertex}/${textureIndices[corner]}`).join(" ")}`);
    if (lines.length >= 10_000) await flush();
  }

  await flush();
  console.log(JSON.stringify({ inputPath, outputPath, vertexCount, faceCount, textureCoordinates: textureIndex - 1 }));
} finally {
  await file.close();
  await output.close();
}
