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
import { basename, dirname, extname, join, resolve } from "node:path";
import { available, fileInfo, run, skill, speechEngine } from "./runtime.mjs";

const require = createRequire(import.meta.url);
const fps = 30;
const sizes = { l: [854, 480], m: [1280, 720], h: [1920, 1080] };

async function execute(program, args) {
  const result = await run(program, args, 900000);
  if (result.code !== 0)
    throw new Error(
      `${basename(program)} failed: ${(result.stderr || result.stdout).trim().slice(-2000)}`,
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

async function loadProject(path) {
  const project = JSON.parse(await readFile(path, "utf8"));
  if (!project || Array.isArray(project) || typeof project !== "object")
    throw new Error("The project must be a JSON object.");
  if (typeof project.source !== "string")
    throw new Error("Set source to the React scene module.");
  const source = resolve(dirname(path), project.source);
  if (
    ![".jsx", ".tsx", ".js", ".ts"].includes(extname(source)) ||
    !(await fileInfo(source))?.isFile()
  )
    throw new Error(
      "Source must be an existing React JavaScript or TypeScript module.",
    );
  if (!Array.isArray(project.scenes) || !project.scenes.length)
    throw new Error("The project needs a nonempty scenes array.");
  for (const scene of project.scenes) {
    if (
      !scene ||
      typeof scene.name !== "string" ||
      !/^[A-Za-z_$][\w$]*$/.test(scene.name)
    )
      throw new Error("Each scene needs a named React component export.");
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
  return { project, source };
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

export async function render(values) {
  const projectPath = resolve(values.project);
  const { project, source } = await loadProject(projectPath);
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
  const needsSpeech = project.scenes.some((scene) =>
    scene.beats.some((beat) => beat.audio === undefined),
  );
  const engine = needsSpeech ? await speechEngine() : null;
  if (needsSpeech && !engine)
    throw new Error(
      "Supply audio for each beat, or install say/espeak-ng for local narration.",
    );
  // Rendering imports stay out of the install, help, and version paths.
  const [
    { bundle },
    { openBrowser, renderMedia, renderStill, selectComposition },
  ] = await Promise.all([
    import("@remotion/bundler"),
    import("@remotion/renderer"),
  ]);
  await mkdir(dirname(output), { recursive: true });
  const staging = await mkdtemp(join(dirname(output), `.${basename(output)}-`));
  const result = join(staging, "result");
  let browser;
  try {
    await mkdir(result);
    const publicDir = join(result, "public");
    const suppliedPublic = resolve(
      dirname(projectPath),
      project.public || "public",
    );
    if (await fileInfo(suppliedPublic))
      await cp(suppliedPublic, publicDir, { recursive: true });
    else await mkdir(publicDir);
    const publicAudio = join(publicDir, "__narration");
    if (await fileInfo(publicAudio))
      throw new Error(
        "The public/__narration directory is reserved for generated speech.",
      );
    await mkdir(publicAudio);
    const audioDir = join(staging, "speech");
    await mkdir(audioDir);
    const timeline = {
      title: project.title || "Explainer",
      scenes: [],
      durationInFrames: 0,
      captions: project.captions !== false,
      audio: "__narration/narration.wav",
    };
    const captions = [],
      wavs = [];
    let captionIndex = 1;
    console.error("Preparing measured narration...");
    for (const [i, scene] of project.scenes.entries()) {
      const resolved = {
        name: scene.name,
        startFrame: timeline.durationInFrames,
        durationInFrames: 0,
        references: scene.references || [],
        beats: [],
      };
      for (const [j, beat] of scene.beats.entries()) {
        const name = `scene-${i + 1}-beat-${j + 1}`;
        const raw =
          beat.audio === undefined
            ? await speak(
                beat.text,
                join(audioDir, `${name}-speech`),
                values.voice,
                engine,
              )
            : resolve(dirname(projectPath), beat.audio);
        const spoken = await duration(raw);
        const frames = Math.ceil((spoken + 0.3) * fps);
        const wav = `${name}.wav`;
        await ffmpeg([
          "-i",
          raw,
          "-ar",
          "48000",
          "-ac",
          "2",
          "-af",
          "apad",
          "-t",
          String(frames / fps),
          "-c:a",
          "pcm_s16le",
          join(audioDir, wav),
        ]);
        wavs.push(wav);
        const start = (resolved.startFrame + resolved.durationInFrames) / fps;
        captions.push(
          `${captionIndex++}\n${timestamp(start)} --> ${timestamp(start + spoken)}\n${wrap(beat.text)}\n`,
        );
        resolved.beats.push({
          text: beat.text.trim(),
          startFrame: resolved.durationInFrames,
          durationInFrames: frames,
          speechSeconds: spoken,
        });
        resolved.durationInFrames += frames;
      }
      timeline.scenes.push(resolved);
      timeline.durationInFrames += resolved.durationInFrames;
    }
    const audioList = join(audioDir, "concat.txt");
    await writeFile(audioList, wavs.map((name) => `file '${name}'`).join("\n"));
    await ffmpeg([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      audioList,
      "-c:a",
      "pcm_s16le",
      join(publicAudio, "narration.wav"),
    ]);
    const [width, height] = sizes[values.quality];
    const entry = join(staging, "entry.jsx");
    // Remotion excludes node_modules from JSX transforms; stage the packaged wrapper.
    const wrapper = join(staging, "video-root.jsx");
    await cp(join(skill, "assets", "video-root.jsx"), wrapper);
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
    browser = await openBrowser("chrome", { logLevel: "error" });
    const options = { serveUrl, puppeteerInstance: browser, logLevel: "error" };
    const composition = await selectComposition({
      ...options,
      id: "Explainer",
    });
    console.error(
      `Rendering ${timeline.durationInFrames} frames with Remotion...`,
    );
    await renderMedia({
      ...options,
      composition,
      codec: "h264",
      audioCodec: "aac",
      pixelFormat: "yuv420p",
      outputLocation: join(result, "explainer.mp4"),
      overwrite: false,
    });
    const metadata = await probe(join(result, "explainer.mp4"));
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
    const previewDir = join(result, "preview");
    await mkdir(previewDir);
    const frames = [
      ...new Set([
        Math.floor(timeline.scenes[0].beats[0].durationInFrames / 2),
        Math.floor(timeline.durationInFrames / 2),
        timeline.durationInFrames - 1,
      ]),
    ];
    for (const frame of frames)
      await renderStill({
        ...options,
        composition,
        frame,
        imageFormat: "png",
        output: join(previewDir, `frame-${frame}.png`),
      });
    await writeFile(join(result, "explainer.srt"), captions.join("\n"));
    await writeFile(
      join(result, "manifest.json"),
      JSON.stringify(
        {
          ...timeline,
          renderer: "remotion",
          fps,
          width,
          height,
          project: projectPath,
          source,
          video: "explainer.mp4",
          subtitles: "explainer.srt",
          duration_seconds: actualDuration,
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
      previews: frames.map((frame) =>
        join(output, "preview", `frame-${frame}.png`),
      ),
      duration_seconds: actualDuration,
      renderer: "remotion",
    };
  } finally {
    try {
      await browser?.close({ silent: true });
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
  }
}
