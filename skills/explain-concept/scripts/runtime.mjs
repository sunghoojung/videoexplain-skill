import { spawn } from "node:child_process";
import { lstat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const skill = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function run(program, argv, timeout = 5000) {
  return new Promise((done, reject) => {
    const child = spawn(program, argv, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "",
      stderr = "",
      overflow = false;
    const collect = (channel, data) => {
      if (channel === "out") stdout += data;
      else stderr += data;
      if (stdout.length + stderr.length > 131072) {
        overflow = true;
        child.kill();
      }
    };
    child.stdout.setEncoding("utf8").on("data", (data) => collect("out", data));
    child.stderr.setEncoding("utf8").on("data", (data) => collect("err", data));
    const timer = timeout ? setTimeout(() => child.kill(), timeout) : undefined;
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (overflow) reject(new Error("Command exceeded its output limit."));
      else if (signal)
        reject(
          new Error("Command was interrupted or exceeded its time limit."),
        );
      else done({ code, stdout, stderr });
    });
  });
}

export async function available(program, argv) {
  try {
    return (await run(program, argv)).code === 0;
  } catch {
    return false;
  }
}

export async function fileInfo(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function speechEngine() {
  for (const program of ["say", "espeak-ng", "espeak"]) {
    if (
      await available(program, program === "say" ? ["-v", "?"] : ["--version"])
    )
      return program;
  }
  return null;
}
