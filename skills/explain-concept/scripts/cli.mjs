import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
} from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { VERSION } from "./version.mjs";

const skill = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const invocation =
  "npx --yes --package=github:sunghoojung/videoexplain-skill explain-concept";
const agentRoots = {
  codex: join(process.env.CODEX_HOME || join(homedir(), ".codex"), "skills"),
  claude: join(homedir(), ".claude", "skills"),
  opencode: join(
    process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
    "opencode",
    "skills",
  ),
};
const schemas = {
  doctor: {},
  install: {
    agent: { type: "string", default: "codex" },
    path: { type: "string" },
    replace: { type: "boolean" },
  },
  guide: {
    mode: { type: "string", default: "concept" },
    full: { type: "boolean" },
  },
  prepare: Object.fromEntries(
    ["video", "subtitles", "output", "start", "end", "max-frames", "jobs"].map(
      (key) => [key, { type: "string" }],
    ),
  ),
};
const commandHelp = {
  doctor:
    "Check explanation, caption, and frame readiness; no packages are installed. Example: explain-concept doctor",
  install:
    "Install the skill. --agent codex|claude|opencode (default codex); --path <skills-parent>; --replace backs up an existing differing install. Examples: explain-concept install; explain-concept install --agent claude",
  guide:
    "Read teaching instructions. --mode concept|video|animation (default concept); --full shows all text (default preview 1200 chars). Examples: explain-concept guide; explain-concept guide --mode video --full",
  prepare:
    "Prepare local video/captions. Required: --output <new-directory>; one or both of --video <file> and --subtitles <srt-or-vtt>. Optional: --start <seconds> (0), --end <seconds> (source end), --max-frames <1-60> (8), --jobs <1-4> (2). Examples: explain-concept prepare --subtitles lesson.vtt --output evidence; explain-concept prepare --video lesson.mp4 --start 30 --end 60 --output passage",
};

function emit(data) {
  console.log(JSON.stringify(data));
}

function usage(message) {
  const error = new Error(message);
  error.exitCode = 2;
  return error;
}

function run(program, argv, timeout = 5000) {
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
      if (stdout.length + stderr.length > 16384) {
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

async function available(program, argv) {
  try {
    return (await run(program, argv)).code === 0;
  } catch {
    return false;
  }
}

async function pythonCommand() {
  const candidates = process.env.PAPEREXPLAIN_PYTHON
    ? [process.env.PAPEREXPLAIN_PYTHON]
    : ["python3", "python"];
  for (const program of candidates) {
    if (
      await available(program, [
        "-c",
        "import sys; sys.exit(sys.version_info < (3, 9))",
      ])
    )
      return program;
  }
  throw new Error(
    "Caption and video preparation need Python 3.9+; explanation and skill installation work without it.",
  );
}

async function exists(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function fingerprint(directory) {
  const hash = createHash("sha256");
  async function walk(path, relative = "") {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      if (
        entry.name === "__pycache__" ||
        entry.name.endsWith(".pyc") ||
        entry.name === ".DS_Store"
      )
        continue;
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(join(path, entry.name), name);
      else if (entry.isFile())
        hash
          .update(name + "\0")
          .update(await readFile(join(path, entry.name)))
          .update("\0");
      else
        throw new Error(
          "Skill installations must contain ordinary files and directories.",
        );
    }
  }
  await walk(directory);
  return hash.digest("hex");
}

async function install(values) {
  if (!Object.hasOwn(agentRoots, values.agent))
    throw usage("--agent must be codex, claude, or opencode.");
  const parent = resolve(values.path || agentRoots[values.agent]);
  const destination = join(parent, "explain-concept");
  const current = await exists(destination);
  if (current && (!current.isDirectory() || current.isSymbolicLink()))
    throw new Error("Installation target must be an ordinary skill directory.");
  if (
    current &&
    (await fingerprint(destination)) === (await fingerprint(skill))
  )
    return { status: "already installed", path: destination };
  if (current && !values.replace)
    throw usage(
      "A different skill is installed. Use install --replace to update it and retain a backup.",
    );
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(join(parent, ".explain-concept-"));
  const prepared = join(staging, "prepared");
  let backup;
  try {
    await cp(skill, prepared, {
      recursive: true,
      filter: (path) => !/(__pycache__|\.pyc$|\.DS_Store$)/.test(path),
    });
    if (current) {
      backup = join(staging, "previous");
      await rename(destination, backup);
    }
    try {
      await rename(prepared, destination);
    } catch (error) {
      if (backup) await rename(backup, destination);
      throw error;
    }
    if (!backup) await rm(staging, { recursive: true });
    return {
      status: "installed",
      path: destination,
      ...(backup ? { backup } : {}),
    };
  } catch (error) {
    // A failed rollback retains the previous installation for recovery.
    if (!backup || !(await exists(backup)))
      await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

export async function main(args) {
  const json = args.includes("--json");
  if (!args.length || (args[0]?.startsWith("-") && args.includes("--help"))) {
    try {
      parseArgs({
        args,
        options: { help: { type: "boolean" }, json: { type: "boolean" } },
        strict: true,
        allowPositionals: false,
      });
    } catch (error) {
      process.exitCode = 2;
      console.error(
        JSON.stringify({
          error: error.message,
          help: "Valid flags: --help, --json",
        }),
      );
      return;
    }
    const help = {
      usage: "explain-concept <command> [options]",
      commands: [
        "doctor: check readiness",
        "install: install the skill",
        "guide: read teaching instructions",
        "prepare: prepare video evidence",
      ],
      examples: [
        "npx --yes . doctor",
        "npx --yes . install",
        "npx --yes . prepare --subtitles lesson.vtt --output evidence",
      ],
    };
    if (json) emit(help);
    else
      console.log(
        [
          help.usage,
          "",
          ...help.commands,
          "",
          ...help.examples,
          "",
          "Each command supports --help. Results use JSON.",
        ].join("\n"),
      );
    return;
  }
  const command = args[0]?.startsWith("-") ? "doctor" : args[0] || "doctor";
  const flags = args[0]?.startsWith("-") ? args : args.slice(1);
  try {
    if (!Object.hasOwn(schemas, command))
      throw usage(
        `Unknown command ${command}; choose doctor, install, guide, or prepare.`,
      );
    let values;
    try {
      ({ values } = parseArgs({
        args: flags,
        options: {
          ...schemas[command],
          help: { type: "boolean" },
          json: { type: "boolean" },
        },
        strict: true,
        allowPositionals: false,
      }));
    } catch (error) {
      throw usage(error.message);
    }
    if (values.help) {
      if (json) emit({ command, usage: commandHelp[command] });
      else
        console.log(
          `${commandHelp[command]}\nResults use JSON. --version, -v, -V print the version.`,
        );
      return;
    }
    if (command === "doctor") {
      const [python, videoTools, installed] = await Promise.all([
        pythonCommand().catch(() => null),
        Promise.all(
          ["ffmpeg", "ffprobe"].map((tool) => available(tool, ["-version"])),
        ),
        exists(join(agentRoots.codex, "explain-concept", "SKILL.md")),
      ]);
      return emit({
        bin: join(skill, "scripts", "explain-concept.mjs").replace(
          homedir(),
          "~",
        ),
        description: "Teach concepts and prepare local video evidence",
        version: VERSION,
        explanations: "ready; no API keys needed",
        captions: python ? "ready" : "Python 3.9+ needed",
        frames:
          python && videoTools.every(Boolean)
            ? "ready"
            : "Python 3.9+ and FFmpeg tools needed",
        codex_skill: installed ? "installed" : "not installed",
        help: [`${invocation} install`, `${invocation} guide --full`],
      });
    }
    if (command === "install")
      return emit({
        ...(await install(values)),
        next: "Use $explain-concept to explain a concept, paper, or video.",
      });
    if (command === "guide") {
      const files = {
        concept: "SKILL.md",
        video: "references/video-input.md",
        animation: "references/animated-video.md",
      };
      if (!Object.hasOwn(files, values.mode))
        throw usage("--mode must be concept, video, or animation.");
      const text = await readFile(join(skill, files[values.mode]), "utf8");
      return emit({
        mode: values.mode,
        path: join(skill, files[values.mode]),
        total_chars: text.length,
        content: values.full ? text : text.slice(0, 1200),
        ...(!values.full && text.length > 1200
          ? { help: [`${invocation} guide --mode ${values.mode} --full`] }
          : {}),
      });
    }
    if (!values.output || (!values.video && !values.subtitles))
      throw usage(
        "prepare requires --output and at least one of --video or --subtitles.",
      );
    for (const [flag, min, max] of [
      ["start", 0, Infinity],
      ["end", 0, Infinity],
      ["max-frames", 1, 60],
      ["jobs", 1, 4],
    ]) {
      if (
        values[flag] !== undefined &&
        (!values[flag].trim() ||
          !Number.isFinite(Number(values[flag])) ||
          Number(values[flag]) < min ||
          Number(values[flag]) > max ||
          (["jobs", "max-frames"].includes(flag) &&
            !Number.isInteger(Number(values[flag]))))
      )
        throw usage(`Invalid --${flag} value.`);
    }
    if (
      values.end !== undefined &&
      Number(values.end) <= Number(values.start || 0)
    )
      throw usage("--end must be greater than --start.");
    const python = await pythonCommand();
    const forwarded = Object.entries(values)
      .filter(([key]) => Object.hasOwn(schemas.prepare, key))
      .flatMap(([key, value]) => [`--${key}`, value]);
    const result = await run(
      python,
      [join(skill, "scripts", "prepare_video.py"), ...forwarded],
      0,
    );
    if (result.code !== 0) {
      const message =
        result.stderr.trim().slice(-1200) || "Evidence preparation failed.";
      throw result.code === 2 ? usage(message) : new Error(message);
    }
    emit({
      ...JSON.parse(result.stdout),
      next: "Read the manifest and transcript, and inspect frames before explaining the video.",
    });
  } catch (error) {
    process.exitCode = error.exitCode || 1;
    console.error(
      JSON.stringify({
        error: error.message,
        help:
          commandHelp[command] || "Commands: doctor, install, guide, prepare",
      }),
    );
  }
}
