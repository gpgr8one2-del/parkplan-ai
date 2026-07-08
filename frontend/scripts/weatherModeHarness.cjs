#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createRequire } = require("module");

const frontendRoot = path.resolve(__dirname, "..");
const frontendRequire = createRequire(path.join(frontendRoot, "package.json"));
const moduleCache = new Map();

function getBabel() {
  try {
    return frontendRequire("@babel/core");
  } catch (error) {
    throw new Error(
      "Could not load @babel/core from frontend dependencies. Run npm install in frontend before this harness."
    );
  }
}

function getModuleTransformPlugin() {
  const candidates = [
    "@babel/plugin-transform-modules-commonjs",
    "@babel/plugin-transform-modules-amd",
  ];

  for (const candidate of candidates) {
    try {
      return frontendRequire.resolve(candidate);
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(
    "Could not find a Babel module transform plugin in frontend dependencies."
  );
}

const babel = getBabel();
const moduleTransformPlugin = getModuleTransformPlugin();

function resolveLocalRequest(request, parentDir) {
  if (request.startsWith("src/")) {
    return resolveExistingPath(path.join(frontendRoot, request));
  }

  if (request.startsWith("@/")) {
    return resolveExistingPath(path.join(frontendRoot, "src", request.slice(2)));
  }

  if (request.startsWith(".")) {
    return resolveExistingPath(path.resolve(parentDir, request));
  }

  return null;
}

function resolveExistingPath(basePath) {
  const candidates = [
    basePath,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.json`,
    path.join(basePath, "index.js"),
    path.join(basePath, "index.jsx"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  throw new Error(`Could not resolve local module: ${basePath}`);
}

function transformSource(filename, source) {
  const result = babel.transformSync(source, {
    filename,
    babelrc: false,
    configFile: false,
    sourceType: "module",
    plugins: [moduleTransformPlugin],
  });

  if (!result || !result.code) {
    throw new Error(`Babel did not return code for ${filename}`);
  }

  return result.code;
}

function loadModule(filename) {
  const resolvedFilename = path.resolve(filename);

  if (moduleCache.has(resolvedFilename)) {
    return moduleCache.get(resolvedFilename).exports;
  }

  if (resolvedFilename.endsWith(".json")) {
    const jsonModule = {
      exports: JSON.parse(fs.readFileSync(resolvedFilename, "utf8")),
    };
    moduleCache.set(resolvedFilename, jsonModule);
    return jsonModule.exports;
  }

  if (
    resolvedFilename.endsWith(".css") ||
    resolvedFilename.endsWith(".scss") ||
    resolvedFilename.endsWith(".sass") ||
    resolvedFilename.endsWith(".png") ||
    resolvedFilename.endsWith(".jpg") ||
    resolvedFilename.endsWith(".jpeg") ||
    resolvedFilename.endsWith(".svg")
  ) {
    const assetModule = { exports: {} };
    moduleCache.set(resolvedFilename, assetModule);
    return assetModule.exports;
  }

  const source = fs.readFileSync(resolvedFilename, "utf8");
  const code = transformSource(resolvedFilename, source);

  const module = { exports: {} };
  moduleCache.set(resolvedFilename, module);

  const dirname = path.dirname(resolvedFilename);

  function localRequire(request) {
    const localPath = resolveLocalRequest(request, dirname);
    if (localPath) {
      return loadModule(localPath);
    }

    return frontendRequire(request);
  }

  const wrapped = `(function(require, module, exports, __filename, __dirname) {
${code}
})`;

  const fn = vm.runInThisContext(wrapped, { filename: resolvedFilename });
  fn(localRequire, module, module.exports, resolvedFilename, dirname);

  return module.exports;
}

const weatherAdvicePath = path.join(
  frontendRoot,
  "src",
  "utils",
  "weatherAdvice.js"
);

const { getWeatherMode } = loadModule(weatherAdvicePath);

if (typeof getWeatherMode !== "function") {
  throw new Error("Could not load getWeatherMode from weatherAdvice.js");
}

const baseWeather = {
  tempF: 78,
  feelsLikeF: 78,
  rainRisk: 0.1,
  stormMode: false,
  currentPrecipitation: false,
  upcomingPrecipitation: false,
  precipitationProbability: 0,
  precipitationIntensityInPerHr: 0,
  weatherCode: 1000,
  summary: "Clear",
  nextPrecipitationWindow: null,
};

const scenarios = [
  {
    name: "active storm overhead",
    weather: {
      ...baseWeather,
      summary: "Thunderstorm",
      stormMode: true,
      currentPrecipitation: true,
      rainRisk: 0.9,
      precipitationProbability: 90,
      precipitationIntensityInPerHr: 0.18,
      weatherCode: 8000,
    },
    expected: {
      mode: "storm",
      label: "Storm Smart Mode",
    },
  },
  {
    name: "nearby storm signal without current rain",
    weather: {
      ...baseWeather,
      summary: "Cloudy",
      stormMode: true,
      currentPrecipitation: false,
      rainRisk: 0.8,
      precipitationProbability: 5,
      precipitationIntensityInPerHr: 0,
      weatherCode: 4201,
      upcomingPrecipitation: true,
      nextPrecipitationWindow: {
        time: "2026-07-09T00:00:00Z",
        summary: "Heavy rain",
        rainRisk: 0.8,
        precipitationProbability: 5,
        precipitationIntensityInPerHr: 0,
        weatherCode: 4201,
      },
    },
    expected: {
      mode: "rain",
      label: "Storm Watch",
    },
  },
  {
    name: "incoming heavy rain window",
    weather: {
      ...baseWeather,
      summary: "Cloudy",
      stormMode: false,
      currentPrecipitation: false,
      rainRisk: 0.4,
      precipitationProbability: 5,
      precipitationIntensityInPerHr: 0,
      weatherCode: 1001,
      upcomingPrecipitation: true,
      nextPrecipitationWindow: {
        time: "2026-07-09T00:00:00Z",
        summary: "Heavy rain",
        rainRisk: 0.8,
        precipitationProbability: 5,
        precipitationIntensityInPerHr: 0,
        weatherCode: 4201,
      },
    },
    expected: {
      mode: "rain",
      label: "Storm Watch",
    },
  },
  {
    name: "incoming light rain window",
    weather: {
      ...baseWeather,
      summary: "Cloudy",
      stormMode: false,
      currentPrecipitation: false,
      rainRisk: 0.4,
      precipitationProbability: 5,
      precipitationIntensityInPerHr: 0,
      weatherCode: 1001,
      upcomingPrecipitation: true,
      nextPrecipitationWindow: {
        time: "2026-07-09T00:00:00Z",
        summary: "Light rain",
        rainRisk: 0.4,
        precipitationProbability: 5,
        precipitationIntensityInPerHr: 0,
        weatherCode: 4200,
      },
    },
    expected: {
      mode: "rain",
      label: "Rain Watch",
    },
  },
  {
    name: "clear comfortable weather",
    weather: {
      ...baseWeather,
      summary: "Clear",
      rainRisk: 0.1,
      stormMode: false,
      currentPrecipitation: false,
      upcomingPrecipitation: false,
      nextPrecipitationWindow: null,
    },
    expected: {
      notMode: "storm",
      notLabel: "Storm Smart Mode",
    },
  },
];

let failures = 0;

for (const scenario of scenarios) {
  const result = getWeatherMode(scenario.weather);
  const failedChecks = [];

  if (scenario.expected.mode && result?.mode !== scenario.expected.mode) {
    failedChecks.push(`mode expected ${scenario.expected.mode}, got ${result?.mode}`);
  }

  if (scenario.expected.label && result?.label !== scenario.expected.label) {
    failedChecks.push(`label expected ${scenario.expected.label}, got ${result?.label}`);
  }

  if (scenario.expected.notMode && result?.mode === scenario.expected.notMode) {
    failedChecks.push(`mode should not be ${scenario.expected.notMode}`);
  }

  if (scenario.expected.notLabel && result?.label === scenario.expected.notLabel) {
    failedChecks.push(`label should not be ${scenario.expected.notLabel}`);
  }

  if (failedChecks.length) {
    failures += 1;
    console.error(`FAIL: ${scenario.name}`);
    console.error(`  ${failedChecks.join("; ")}`);
    console.error(`  result=${JSON.stringify(result)}`);
  } else {
    console.log(`PASS: ${scenario.name} -> ${result?.label || result?.mode || "unknown"}`);
  }
}

if (failures) {
  console.error("");
  console.error(`${failures} weather mode scenario(s) failed`);
  process.exit(1);
}

console.log("");
console.log("all weather mode harness scenarios passed");
