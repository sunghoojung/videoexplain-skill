import { spawn } from "node:child_process";

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
