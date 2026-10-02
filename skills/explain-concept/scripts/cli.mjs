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
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { VERSION } from "./version.mjs";
import { available, run } from "./process.mjs";

const require = createRequire(import.meta.url);

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
  const error = new Error(message);
  error.exitCode = 2;
  return error;
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
        "ingest: read a research paper",
        "render: create a narrated explainer",
      ],
      examples: [
        "npx --yes . doctor",
        "npx --yes . install",
        "npx --yes . ingest --paper paper.pdf --output paper-source",
        "npx --yes . render --project project.json --output video",
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
        `Unknown command ${command}; choose doctor, install, guide, ingest, or render.`,
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
      const python = await pythonCommand(values.python).catch(() => null);
      const moduleReady = (module) =>
        python
          ? available(python, [
              "-c",
              `import importlib.util,sys; sys.exit(importlib.util.find_spec('${module}') is None)`,
            ])
          : false;
      const [paper, ffmpeg, speech, installed] = await Promise.all([
        moduleReady("pypdf"),
        Promise.all(
          ["ffmpeg", "ffprobe"].map((tool) => available(tool, ["-version"])),
        ),
        Promise.all(
          ["say", "espeak-ng", "espeak"].map((tool) =>
            available(tool, tool === "say" ? ["-v", "?"] : ["--version"]),
          ),
        ),
        exists(join(agentRoots.codex, "explain-concept", "SKILL.md")),
      ]);
      let remotion = true;
      for (const module of [
        "remotion",
        "@remotion/bundler",
        "@remotion/renderer",
      ]) {
        try {
          require.resolve(module);
        } catch {
          remotion = false;
        }
      }
      return emit({
        renderer: "remotion",
        browser: "Headless Chrome is downloaded on first render when needed",
        version: VERSION,
        python,
        paper_ingestion: paper ? "ready" : "pypdf needed",
        rendering:
          remotion && ffmpeg.every(Boolean)
            ? "ready"
            : "Run through the npx package with ffmpeg and ffprobe on PATH",
        narration: speech.some(Boolean)
          ? "local speech ready"
          : "supply beat audio or install a speech engine",
        codex_skill: installed ? "installed" : "not installed",
      });
    }
    if (command === "install")
      return emit({
        ...(await install(values)),
        next: "Use $explain-concept to create a narrated video from a paper or concept.",
      });
    if (command === "guide") {
      const files = {
        concept: "SKILL.md",
        paper: "references/paper.md",
        production: "references/animated-video.md",
      };
      if (!Object.hasOwn(files, values.mode))
        throw usage("--mode must be concept, paper, or production.");
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
    if (
      !values.output ||
      !(command === "ingest" ? values.paper : values.project)
    )
      throw usage(commandHelp[command]);
    if (command === "render" && !["l", "m", "h"].includes(values.quality))
      throw usage("--quality must be l, m, or h.");
    if (command === "ingest" && values["preview-pages"] !== undefined) {
      const count = Number(values["preview-pages"]);
      if (
        !values["preview-pages"].trim() ||
        !Number.isInteger(count) ||
        count < 0 ||
        count > 20
      )
        throw usage("--preview-pages must be an integer from 0 to 20.");
    }
    if (command === "render") {
      const { render } = await import("./render.mjs");
      return emit(await render(values));
    }
    const python = await pythonCommand(values.python);
    const forwarded = Object.entries(values)
      .filter(
        ([key]) => key !== "python" && Object.hasOwn(schemas[command], key),
      )
      .flatMap(([key, value]) => [`--${key}`, value]);
    const result = await run(
      python,
      [join(skill, "scripts", "read_paper.py"), ...forwarded],
      0,
    );
    if (result.code !== 0) {
      const message = result.stderr.trim().slice(-2000) || "Pipeline failed.";
      throw result.code === 2 ? usage(message) : new Error(message);
    }
    emit(JSON.parse(result.stdout));
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
