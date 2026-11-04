import { spawn } from "node:child_process";
import { lstat, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const skill = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function run(program, argv, timeout = 5000, options = {}) {
  return new Promise((done, reject) => {
    const child = spawn(program, argv, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      ...options,
    });
    let stdout = "",
      stderr = "",
      overflow = false;
    const collect = (channel, data) => {
      if (channel === "out") stdout += data;
      else stderr += data;
      if (stdout.length + stderr.length > 1048576) {
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

export async function available(program, argv, options) {
  try {
    return (await run(program, argv, 15000, options)).code === 0;
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

/**
 * The shared Python environment that `setup` creates, so every project, shell,
 * and agent session finds Manim without per-project installs or environment
 * variables. Override the location with EXPLAIN_CONCEPT_HOME.
 */
export function sharedEnvironment() {
  const home =
    process.env.EXPLAIN_CONCEPT_HOME ||
    join(
      process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"),
      "explain-concept",
    );
  const venv = join(home, "venv");
  return {
    venv,
    python:
      process.platform === "win32"
        ? join(venv, "Scripts", "python.exe")
        : join(venv, "bin", "python"),
  };
}

/**
 * Find Python 3.11+ that can import `module`. Checks an explicit choice, then
 * EXPLAIN_CONCEPT_PYTHON, then virtual environments in the given directories
 * (default: the working directory), then the shared environment from `setup`,
 * then python3/python on PATH.
 */
export async function findPython(explicit, module, directories = ["."]) {
  const selected =
    explicit ||
    process.env.EXPLAIN_CONCEPT_PYTHON ||
    process.env.PAPEREXPLAIN_PYTHON;
  const candidates = selected
    ? [selected]
    : [
        ...new Set(
          directories.flatMap((dir) => [
            resolve(dir, ".venv/bin/python"),
            resolve(dir, ".venv/Scripts/python.exe"),
          ]),
        ),
        sharedEnvironment().python,
        "python3",
        "python",
      ];
  const check = `import importlib.util,sys; sys.exit(sys.version_info < (3, 11) or importlib.util.find_spec(${JSON.stringify(module)}) is None)`;
  for (const program of candidates) {
    if (await available(program, ["-c", check])) return program;
  }
  return null;
}

async function texCandidates() {
  const roots = [
    join(homedir(), "Library", "TinyTeX", "bin"),
    join(homedir(), ".TinyTeX", "bin"),
  ];
  const dirs = ["/Library/TeX/texbin"];
  for (const root of roots) {
    try {
      for (const entry of await readdir(root)) dirs.push(join(root, entry));
    } catch {}
  }
  try {
    for (const year of (await readdir("/usr/local/texlive")).sort().reverse())
      for (const entry of await readdir(join("/usr/local/texlive", year, "bin")))
        dirs.push(join("/usr/local/texlive", year, "bin", entry));
  } catch {}
  return dirs;
}

/**
 * Return a PATH where `latex` and `dvisvgm` resolve, adding a common TeX
 * installation (TinyTeX, MacTeX/BasicTeX, TeX Live) when PATH lacks one.
 */
export async function texPath() {
  const path = process.env.PATH || "";
  const ready = async (searchPath) =>
    (
      await Promise.all(
        ["latex", "dvisvgm"].map((tool) =>
          available(tool, ["--version"], {
            env: { ...process.env, PATH: searchPath },
          }),
        ),
      )
    ).every(Boolean);
  if (await ready(path)) return path;
  for (const dir of await texCandidates()) {
    if (!(await fileInfo(join(dir, "latex")))) continue;
    const candidate = `${path}${delimiter}${dir}`;
    if (await ready(candidate)) return candidate;
  }
  return null;
}
