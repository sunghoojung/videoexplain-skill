import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { VERSION } from "./version.mjs";
import { available, fileInfo, run, skill, speechEngine } from "./runtime.mjs";

const require = createRequire(import.meta.url);

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
  doctor: { python: { type: "string" } },
  install: {
    agent: { type: "string", default: "codex" },
    path: { type: "string" },
    replace: { type: "boolean" },
  },
  guide: {
    mode: { type: "string", default: "concept" },
    full: { type: "boolean" },
  },
  ingest: {
    paper: { type: "string" },
    output: { type: "string" },
    python: { type: "string" },
    "preview-pages": { type: "string" },
  },
  render: {
    project: { type: "string" },
    output: { type: "string" },
    quality: { type: "string", default: "m" },
    voice: { type: "string" },
  },
};
const commandHelp = {
  doctor:
    "Check paper ingestion and narrated rendering dependencies. Optional: --python <interpreter>.",
  install:
    "Install the skill. --agent codex|claude|opencode (default codex); --path <skills-parent>; --replace keeps a backup of the existing installation.",
  guide:
    "Read instructions. --mode concept|paper|production (default concept); --full shows complete text.",
  ingest:
    "Read a paper. Required: --paper <pdf-or-text> --output <new-directory>. Optional: --python <interpreter>, --preview-pages <0-20> (default 3).",
  render:
    "Render an authored narrated explainer. Required: --project <project.json> --output <new-directory>. Optional: --quality l|m|h (default m), --voice <local-voice-name>.",
};

function emit(data) {
  console.log(JSON.stringify(data));
}
function usage(message) {
  return Object.assign(new Error(message), { exitCode: 2 });
}
function ignored(path) {
  const name = basename(path);
  return (
    name === "__pycache__" || name === ".DS_Store" || name.endsWith(".pyc")
  );
}

async function pythonCommand(explicit) {
  const selected = explicit || process.env.PAPEREXPLAIN_PYTHON;
  const candidates = selected
    ? [selected]
    : [
        resolve(".venv/bin/python"),
        resolve(".venv/Scripts/python.exe"),
        "python3",
        "python",
      ];
  for (const program of candidates) {
    if (
      await available(program, [
        "-c",
        "import sys; sys.exit(sys.version_info < (3, 11))",
      ])
    )
      return program;
  }
  throw new Error(
    "Select Python 3.11+ with --python; PDF ingestion needs pypdf in the chosen environment.",
  );
}

async function fingerprint(directory) {
  const hash = createHash("sha256");
  async function walk(path, relative = "") {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      if (ignored(entry.name)) continue;
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
  const current = await fileInfo(destination);
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
      filter: (path) => !ignored(path),
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
    if (!backup || !(await fileInfo(backup)))
      await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

async function doctor(values) {
  const python = await pythonCommand(values.python).catch(() => null);
  const [paper, media, speech, installed] = await Promise.all([
    python &&
      available(python, [
        "-c",
        "import importlib.util,sys; sys.exit(importlib.util.find_spec('pypdf') is None)",
      ]),
    Promise.all(
      ["ffmpeg", "ffprobe"].map((tool) => available(tool, ["-version"])),
    ),
    speechEngine(),
    fileInfo(join(agentRoots.codex, "explain-concept", "SKILL.md")),
  ]);
  const remotion = [
    "remotion",
    "@remotion/bundler",
    "@remotion/renderer",
  ].every((module) => {
    try {
      require.resolve(module);
      return true;
    } catch {
      return false;
    }
  });
  return {
    renderer: "remotion",
    browser: "Headless Chrome is downloaded on first render when needed",
    version: VERSION,
    python,
    paper_ingestion: paper ? "ready" : "pypdf needed",
    rendering:
      remotion && media.every(Boolean)
        ? "ready"
        : "Run through the npx package with ffmpeg and ffprobe on PATH",
    narration: speech
      ? "local speech ready"
      : "supply beat audio or install a speech engine",
    codex_skill: installed ? "installed" : "not installed",
  };
}

async function guide(values) {
  const files = {
    concept: "SKILL.md",
    paper: "references/paper.md",
    production: "references/animated-video.md",
  };
  if (!Object.hasOwn(files, values.mode))
    throw usage("--mode must be concept, paper, or production.");
  const path = join(skill, files[values.mode]);
  const text = await readFile(path, "utf8");
  return {
    mode: values.mode,
    path,
    total_chars: text.length,
    content: values.full ? text : text.slice(0, 1200),
    ...(!values.full && text.length > 1200
      ? { help: [`${invocation} guide --mode ${values.mode} --full`] }
      : {}),
  };
}

async function ingest(values) {
  if (
    values["preview-pages"] !== undefined &&
    !/^(?:\d|1\d|20)$/.test(values["preview-pages"])
  )
    throw usage("--preview-pages must be an integer from 0 to 20.");
  const python = await pythonCommand(values.python);
  const flags = Object.entries(values)
    .filter(([key]) => key !== "python" && Object.hasOwn(schemas.ingest, key))
    .flatMap(([key, value]) => [`--${key}`, value]);
  const result = await run(
    python,
    [join(skill, "scripts", "read_paper.py"), ...flags],
    0,
  );
  if (result.code !== 0) {
    const message =
      result.stderr.trim().slice(-2000) || "Paper ingestion failed.";
    throw result.code === 2 ? usage(message) : new Error(message);
  }
  return JSON.parse(result.stdout);
}

export async function main(args) {
  const generalHelp =
    !args.length || (args[0].startsWith("-") && args.includes("--help"));
  const command = generalHelp
    ? null
    : args[0].startsWith("-")
      ? "doctor"
      : args[0];
  const flags = generalHelp || args[0].startsWith("-") ? args : args.slice(1);
  try {
    if (command && !Object.hasOwn(schemas, command))
      throw usage(
        `Unknown command ${command}; choose ${Object.keys(schemas).join(", ")}.`,
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
    if (generalHelp || values.help) {
      const help = command
        ? { command, usage: commandHelp[command] }
        : {
            usage: "explain-concept <command> [options]",
            commands: commandHelp,
          };
      if (values.json) emit(help);
      else
        console.log(
          command
            ? help.usage
            : [
                help.usage,
                "",
                ...Object.entries(commandHelp).map(
                  ([name, text]) => `${name}: ${text}`,
                ),
              ].join("\n"),
        );
      return;
    }
    if (command === "doctor") return emit(await doctor(values));
    if (command === "guide") return emit(await guide(values));
    if (command === "install")
      return emit({
        ...(await install(values)),
        next: "Use $explain-concept to create a narrated video from a paper or concept.",
      });
    if (
      !values.output ||
      !(command === "ingest" ? values.paper : values.project)
    )
      throw usage(commandHelp[command]);
    if (command === "ingest") return emit(await ingest(values));
    if (!["l", "m", "h"].includes(values.quality))
      throw usage("--quality must be l, m, or h.");
    const { render } = await import("./render.mjs");
    emit(await render(values));
  } catch (error) {
    process.exitCode = error.exitCode || 1;
    console.error(
      JSON.stringify({
        error: error.message,
        help:
          commandHelp[command] ||
          "Commands: doctor, install, guide, ingest, render",
      }),
    );
  }
}
