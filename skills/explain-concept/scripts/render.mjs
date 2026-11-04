import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  rmdir,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { availableParallelism } from "node:os";
import { basename, delimiter, dirname, extname, join, resolve } from "node:path";
import { lintProject } from "./narration.mjs";
import {
  available,
  fileInfo,
  findPython,
  run,
  skill,
  speechEngine,
  texPath,
} from "./runtime.mjs";

const require = createRequire(import.meta.url);
const fps = 30;
const sizes = { l: [854, 480], m: [1280, 720], h: [1920, 1080] };
// A visual hold longer than this without speech is probably unintended.
const LONG_HOLD_SECONDS = 4;

async function execute(program, args, options = {}, timeout = 900000) {
  const result = await run(program, args, timeout, options);
  if (result.code !== 0)
    throw new Error(
      `${basename(program)} failed: ${(result.stderr || result.stdout).trim().slice(-3000)}`,
    );
  return result.stdout;
}

function ffmpeg(args) {
  return execute("ffmpeg", ["-nostdin", "-v", "error", "-n", ...args]);
}

async function probe(path) {
  return JSON.parse(
    await execute("ffprobe", [
      "-v",
      "error",
      "-show_format",
      "-show_streams",
      "-of",
      "json",
      path,
    ]),
  );
}

async function duration(path) {
  const value = Number((await probe(path)).format.duration);
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`Invalid media duration: ${path}`);
  return value;
}

function timestamp(seconds) {
  let remaining = Math.round(seconds * 1000);
  const hours = Math.floor(remaining / 3600000);
  remaining %= 3600000;
  const minutes = Math.floor(remaining / 60000);
  remaining %= 60000;
  const secs = Math.floor(remaining / 1000);
  return `${[hours, minutes, secs].map((n) => String(n).padStart(2, "0")).join(":")},${String(remaining % 1000).padStart(3, "0")}`;
}

function wrap(text) {
  const lines = [""];
  for (const word of text.trim().split(/\s+/)) {
    if (lines.at(-1).length && lines.at(-1).length + word.length + 1 > 64)
      lines.push("");
    lines[lines.length - 1] += `${lines.at(-1) ? " " : ""}${word}`;
  }
  return lines.join("\n");
}

async function loadProject(path, sceneFilter) {
  const project = JSON.parse(await readFile(path, "utf8"));
  if (!project || Array.isArray(project) || typeof project !== "object")
    throw new Error("The project must be a JSON object.");
  if (typeof project.source !== "string")
    throw new Error("Set source to the Manim (.py) or React scene module.");
  const source = resolve(dirname(path), project.source);
  const extension = extname(source);
  if (
    ![".py", ".jsx", ".tsx", ".js", ".ts"].includes(extension) ||
    !(await fileInfo(source))?.isFile()
  )
    throw new Error(
      "Source must be an existing Manim .py file or React JavaScript/TypeScript module.",
    );
  const engine = extension === ".py" ? "manim" : "remotion";
  if (!Array.isArray(project.scenes) || !project.scenes.length)
    throw new Error("The project needs a nonempty scenes array.");
  const names = new Set();
  for (const scene of project.scenes) {
    if (
      !scene ||
      typeof scene.name !== "string" ||
      !/^[A-Za-z_][\w]*$/.test(scene.name)
    )
      throw new Error(
        "Each scene needs the name of a scene class or component exported by the source.",
      );
    if (engine === "manim" && names.has(scene.name))
      throw new Error(
        `Scene ${scene.name} appears twice; give each Manim scene its own class.`,
      );
    names.add(scene.name);
    if (!Array.isArray(scene.beats) || !scene.beats.length)
      throw new Error(`${scene.name} needs narration beats.`);
    for (const beat of scene.beats) {
      if (!beat || typeof beat.text !== "string" || !beat.text.trim())
        throw new Error("Each beat needs nonempty spoken text.");
      if (
        beat.audio !== undefined &&
        (typeof beat.audio !== "string" ||
          !(await fileInfo(resolve(dirname(path), beat.audio)))?.isFile())
      )
        throw new Error("Supplied beat audio must be an existing file.");
    }
    if (
      scene.references !== undefined &&
      (!Array.isArray(scene.references) ||
        scene.references.some((ref) => typeof ref !== "string"))
    )
      throw new Error("Scene references must be an array of source citations.");
  }
  let partial = false;
  if (sceneFilter) {
    const wanted = sceneFilter
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    const unknown = wanted.filter((name) => !names.has(name));
    if (!wanted.length || unknown.length)
      throw Object.assign(
        new Error(
          `--scenes must list scene names from the project: ${[...names].join(", ")}.`,
        ),
        { exitCode: 2 },
      );
    project.scenes = project.scenes.filter((scene) =>
      wanted.includes(scene.name),
    );
    partial = project.scenes.length < names.size;
  }
  return { project, source, engine, partial };
}

async function speak(text, stem, voice, engine) {
  const textFile = `${stem}.txt`;
  await writeFile(textFile, text);
  const audio = `${stem}.${engine === "say" ? "aiff" : "wav"}`;
  const args =
    engine === "say"
      ? ["-f", textFile, "-o", audio]
      : ["-f", textFile, "-w", audio];
  if (voice) args.push("-v", voice);
  await execute(engine, args);
  return audio;
}

// Speech comes first: its measured length is the minimum length of each beat.
async function measureNarration(project, projectPath, audioDir, voice, engine) {
  const scenes = [];
  for (const [i, scene] of project.scenes.entries()) {
    const beats = [];
    for (const [j, beat] of scene.beats.entries()) {
      const raw =
        beat.audio === undefined
          ? await speak(
              beat.text,
              join(audioDir, `scene-${i + 1}-beat-${j + 1}-speech`),
              voice,
              engine,
            )
          : resolve(dirname(projectPath), beat.audio);
      const speechSeconds = await duration(raw);
      beats.push({
        text: beat.text.trim(),
        raw,
        speechSeconds,
        minFrames: Math.ceil((speechSeconds + 0.3) * fps),
      });
    }
    scenes.push({ name: scene.name, references: scene.references || [], beats });
  }
  return scenes;
}

// Pad each beat's speech with silence to the beat's final video length.
async function assembleNarration(scenes, audioDir, output) {
  const wavs = [];
  const captions = [];
  let frame = 0;
  for (const [i, scene] of scenes.entries())
    for (const [j, beat] of scene.beats.entries()) {
      const wav = `scene-${i + 1}-beat-${j + 1}.wav`;
      await ffmpeg([
        "-i",
        beat.raw,
        "-ar",
        "48000",
        "-ac",
        "2",
        "-af",
        "apad",
        "-t",
        String(beat.frames / fps),
        "-c:a",
        "pcm_s16le",
        join(audioDir, wav),
      ]);
      wavs.push(wav);
      const start = frame / fps;
      captions.push(
        `${captions.length + 1}\n${timestamp(start)} --> ${timestamp(start + beat.speechSeconds)}\n${wrap(beat.text)}\n`,
      );
      frame += beat.frames;
    }
  const list = join(audioDir, "concat.txt");
  await writeFile(list, wavs.map((name) => `file '${name}'`).join("\n"));
  await ffmpeg([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-c:a",
    "pcm_s16le",
    output,
  ]);
  return captions.join("\n");
}

async function findFile(directory, name) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "partial_movie_files") continue;
      const found = await findFile(path, name);
      if (found) return found;
    } else if (entry.name === name) return path;
  }
  return null;
}

async function pool(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await task(items[index], index);
      }
    }),
  );
  return results;
}

async function renderManim({ scenes, source, python, staging, width, height }) {
  const work = join(staging, "manim");
  await mkdir(work);
  const timelinePath = join(work, "timeline.json");
  await writeFile(
    timelinePath,
    JSON.stringify({
      fps,
      scenes: Object.fromEntries(
        scenes.map((scene) => [
          scene.name,
          scene.beats.map((beat) => ({
            text: beat.text,
            min_frames: beat.minFrames,
          })),
        ]),
      ),
    }),
  );
  const tex = await texPath();
  const env = {
    ...process.env,
    EXPLAIN_TIMELINE: timelinePath,
    PYTHONPATH: [join(skill, "assets", "manim"), process.env.PYTHONPATH]
      .filter(Boolean)
      .join(delimiter),
    PYTHONDONTWRITEBYTECODE: "1",
    PATH: tex || process.env.PATH,
  };
  const limit = Math.max(1, Math.min(4, Math.floor(availableParallelism() / 2)));
  console.error(
    `Rendering ${scenes.length} Manim scene${scenes.length === 1 ? "" : "s"}...`,
  );
  const videos = await pool(scenes, limit, async (scene) => {
    const media = join(work, scene.name);
    const log = join(work, `${scene.name}.beats.json`);
    const result = await run(
      python,
      [
        "-m",
        "manim",
        "render",
        source,
        scene.name,
        "--format",
        "mp4",
        "--fps",
        String(fps),
        "-r",
        `${width},${height}`,
        "--disable_caching",
        "--progress_bar",
        "none",
        "-v",
        "WARNING",
        "--media_dir",
        media,
        "-o",
        scene.name,
      ],
      3600000,
      {
        cwd: dirname(source),
        env: { ...env, EXPLAIN_BEAT_LOG: log, COLUMNS: "120" },
      },
    );
    if (result.code !== 0) {
      const detail = (result.stderr + result.stdout).trim().slice(-3000);
      const hint =
        !tex && /latex|dvisvgm/i.test(detail)
          ? " LaTeX was not found: MathTex and Tex need latex and dvisvgm (run doctor)."
          : "";
      throw new Error(`Manim scene ${scene.name} failed.${hint}\n${detail}`);
    }
    const video = await findFile(media, `${scene.name}.mp4`);
    const logged = (await fileInfo(log))
      ? JSON.parse(await readFile(log, "utf8"))
      : null;
    if (!video || !logged)
      throw new Error(
        `${scene.name} must be a scene class that subclasses ExplainerScene from explain_kit and plays at least one beat.`,
      );
    const frames = Number(
      (await probe(video)).streams.find((s) => s.codec_type === "video")
        ?.nb_frames,
    );
    const total = logged.beats.reduce((sum, beat) => sum + beat.frames, 0);
    if (frames !== total)
      throw new Error(
        `${scene.name} rendered ${frames} frames, but its beats account for ${total}.`,
      );
    logged.beats.forEach((beat, i) => (scene.beats[i].frames = beat.frames));
    return video;
  });
  const list = join(work, "scenes.txt");
  await writeFile(list, videos.map((path) => `file '${path}'`).join("\n"));
  const silent = join(work, "video.mp4");
  await ffmpeg(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", silent]);
  return silent;
}

async function renderRemotion({
  scenes,
  source,
  project,
  projectPath,
  staging,
  result,
  width,
  height,
}) {
  for (const scene of scenes)
    for (const beat of scene.beats) beat.frames = beat.minFrames;
  const [
    { bundle },
    { openBrowser, renderMedia, selectComposition },
  ] = await Promise.all([
    import("@remotion/bundler"),
    import("@remotion/renderer"),
  ]);
  const publicDir = join(result, "public");
  const suppliedPublic = resolve(
    dirname(projectPath),
    project.public || "public",
  );
  if (await fileInfo(suppliedPublic))
    await cp(suppliedPublic, publicDir, { recursive: true });
  else await mkdir(publicDir);
  const timeline = sceneTimeline(scenes, project);
  const entry = join(staging, "entry.jsx");
  // Remotion excludes node_modules from JSX transforms; stage the packaged wrapper.
  const wrapper = join(staging, "video-root.jsx");
  await cp(join(skill, "assets", "remotion", "video-root.jsx"), wrapper);
  await writeFile(
    entry,
    `import {registerRoot} from 'remotion';\nimport {createVideoRoot} from ${JSON.stringify(wrapper)};\nimport * as scenes from ${JSON.stringify(source)};\nregisterRoot(createVideoRoot(scenes, ${JSON.stringify(timeline)}, ${width}, ${height}, ${fps}));\n`,
  );
  console.error("Bundling React scenes...");
  const modules = dirname(dirname(require.resolve("remotion/package.json")));
  const serveUrl = await bundle({
    entryPoint: entry,
    rootDir: resolve(skill, "../.."),
    publicDir,
    outDir: join(result, "bundle"),
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        modules: [modules, ...(config.resolve?.modules || ["node_modules"])],
      },
    }),
  });
  const browser = await openBrowser("chrome", { logLevel: "error" });
  try {
    const options = { serveUrl, puppeteerInstance: browser, logLevel: "error" };
    const composition = await selectComposition({ ...options, id: "Explainer" });
    console.error(
      `Rendering ${timeline.durationInFrames} frames with Remotion...`,
    );
    const silent = join(staging, "video.mp4");
    await renderMedia({
      ...options,
      composition,
      codec: "h264",
      muted: true,
      pixelFormat: "yuv420p",
      outputLocation: silent,
      overwrite: false,
    });
    return silent;
  } finally {
    await browser.close({ silent: true });
  }
}

function sceneTimeline(scenes, project) {
  const timeline = {
    title: project.title || "Explainer",
    captions: project.captions !== false,
    durationInFrames: 0,
    scenes: [],
  };
  for (const scene of scenes) {
    const resolved = {
      name: scene.name,
      startFrame: timeline.durationInFrames,
      durationInFrames: 0,
      references: scene.references,
      beats: [],
    };
    for (const beat of scene.beats) {
      resolved.beats.push({
        text: beat.text,
        startFrame: resolved.durationInFrames,
        durationInFrames: beat.frames,
        speechSeconds: beat.speechSeconds,
        holdSeconds: Math.max(0, beat.frames / fps - beat.speechSeconds),
      });
      resolved.durationInFrames += beat.frames;
    }
    timeline.scenes.push(resolved);
    timeline.durationInFrames += resolved.durationInFrames;
  }
  return timeline;
}

// Frames for review: the middle and the final state of every beat, plus a
// contact sheet of final states to scan the whole argument at once.
async function previews(video, timeline, directory) {
  await mkdir(directory);
  const shots = [];
  for (const [i, scene] of timeline.scenes.entries())
    for (const [j, beat] of scene.beats.entries()) {
      const start = scene.startFrame + beat.startFrame;
      const stem = `s${String(i + 1).padStart(2, "0")}-b${String(j + 1).padStart(2, "0")}`;
      const end = start + beat.durationInFrames - 1;
      const mid = start + Math.floor(beat.durationInFrames / 2);
      if (mid < end) shots.push({ frame: mid, name: `${stem}-mid.png` });
      shots.push({ frame: end, name: `${stem}-end.png`, end: true });
    }
  shots.sort((a, b) => a.frame - b.frame);
  const select = (list) =>
    `select='${list.map((shot) => `eq(n\\,${shot.frame})`).join("+")}'`;
  const temp = join(directory, ".frames");
  await mkdir(temp);
  await ffmpeg([
    "-i",
    video,
    "-vf",
    select(shots),
    "-fps_mode",
    "passthrough",
    join(temp, "%05d.png"),
  ]);
  const extracted = (await readdir(temp)).sort();
  if (extracted.length !== shots.length)
    throw new Error("Could not extract every beat preview frame.");
  for (const [k, shot] of shots.entries())
    await rename(join(temp, extracted[k]), join(directory, shot.name));
  await rm(temp, { recursive: true });
  const ends = shots.filter((shot) => shot.end);
  const columns = Math.min(4, ends.length);
  const sheet = join(directory, "contact-sheet.png");
  await ffmpeg([
    "-i",
    video,
    "-vf",
    `${select(ends)},scale=480:-2,tile=${columns}x${Math.ceil(ends.length / columns)}:padding=6:color=0x333333`,
    "-fps_mode",
    "passthrough",
    "-frames:v",
    "1",
    sheet,
  ]);
  return { directory, contact_sheet: sheet, frames: shots.length };
}

export async function render(values) {
  const projectPath = resolve(values.project);
  const { project, source, engine, partial } = await loadProject(
    projectPath,
    values.scenes,
  );
  const output = resolve(values.output);
  const current = await fileInfo(output);
  if (
    current &&
    (!current.isDirectory() ||
      current.isSymbolicLink() ||
      (await readdir(output)).length)
  )
    throw new Error(
      "Use a new or empty output directory; existing work is preserved.",
    );
  const [hasFfmpeg, hasFfprobe] = await Promise.all(
    ["ffmpeg", "ffprobe"].map((tool) => available(tool, ["-version"])),
  );
  if (!hasFfmpeg || !hasFfprobe)
    throw new Error("Narrated rendering needs ffmpeg and ffprobe on PATH.");
  const python =
    engine === "manim"
      ? await findPython(values.python, "manim", [".", dirname(projectPath)])
      : null;
  if (engine === "manim" && !python)
    throw new Error(
      "Manim scenes need Python 3.11+ with manim installed. Pass --python <interpreter> or set EXPLAIN_CONCEPT_PYTHON (run doctor for setup).",
    );
  const needsSpeech = project.scenes.some((scene) =>
    scene.beats.some((beat) => beat.audio === undefined),
  );
  const speechProgram = needsSpeech ? await speechEngine() : null;
  if (needsSpeech && !speechProgram)
    throw new Error(
      "Supply audio for each beat, or install say/espeak-ng for local narration.",
    );
  const warnings = lintProject(project);
  await mkdir(dirname(output), { recursive: true });
  const staging = await mkdtemp(join(dirname(output), `.${basename(output)}-`));
  const result = join(staging, "result");
  try {
    await mkdir(result);
    const audioDir = join(staging, "speech");
    await mkdir(audioDir);
    console.error("Measuring narration...");
    const scenes = await measureNarration(
      project,
      projectPath,
      audioDir,
      values.voice,
      speechProgram,
    );
    const [width, height] = sizes[values.quality];
    const context = { scenes, source, project, projectPath, staging, result, width, height, python };
    const silent =
      engine === "manim"
        ? await renderManim(context)
        : await renderRemotion(context);
    const timeline = sceneTimeline(scenes, project);
    const narration = join(staging, "narration.wav");
    const captions = await assembleNarration(scenes, audioDir, narration);
    const subtitles = join(result, "explainer.srt");
    await writeFile(subtitles, captions);
    // Manim frames stay clean; subtitles travel as a track viewers can toggle.
    const softSubtitles = engine === "manim" && project.captions !== false;
    const video = join(result, "explainer.mp4");
    await ffmpeg([
      "-i",
      silent,
      "-i",
      narration,
      ...(softSubtitles ? ["-i", subtitles] : []),
      "-map",
      "0:v",
      "-map",
      "1:a",
      ...(softSubtitles
        ? ["-map", "2:s", "-c:s", "mov_text", "-metadata:s:s:0", "language=eng"]
        : []),
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      video,
    ]);
    const metadata = await probe(video);
    if (
      !["audio", "video"].every((type) =>
        metadata.streams.some((stream) => stream.codec_type === type),
      )
    )
      throw new Error("The final video must contain narration and video.");
    const actualDuration = Number(metadata.format.duration);
    if (
      !Number.isFinite(actualDuration) ||
      Math.abs(actualDuration - timeline.durationInFrames / fps) > 0.1
    )
      throw new Error(
        "The final video duration does not match the narration timeline.",
      );
    for (const scene of timeline.scenes)
      for (const [i, beat] of scene.beats.entries())
        if (beat.holdSeconds > LONG_HOLD_SECONDS)
          warnings.push({
            scene: scene.name,
            beat: i + 1,
            issue: `holds ${beat.holdSeconds.toFixed(1)}s without speech; keep it if the viewer needs that pause, otherwise shorten the animations or move narration into it`,
          });
    const review = await previews(video, timeline, join(result, "preview"));
    await writeFile(
      join(result, "manifest.json"),
      JSON.stringify(
        {
          ...timeline,
          renderer: engine,
          partial,
          fps,
          width,
          height,
          project: projectPath,
          source,
          video: "explainer.mp4",
          subtitles: "explainer.srt",
          subtitle_track: softSubtitles,
          duration_seconds: actualDuration,
          warnings,
        },
        null,
        2,
      ) + "\n",
    );
    if (current) await rmdir(output);
    await rename(result, output);
    return {
      video: join(output, "explainer.mp4"),
      subtitles: join(output, "explainer.srt"),
      previews: join(output, "preview"),
      contact_sheet: join(output, "preview", basename(review.contact_sheet)),
      duration_seconds: actualDuration,
      renderer: engine,
      ...(partial ? { partial: true } : {}),
      warnings,
    };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
