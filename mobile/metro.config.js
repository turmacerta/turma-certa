const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Only watch shared packages — not the whole monorepo (avoids EMFILE).
config.watchFolders = [
  path.resolve(workspaceRoot, "packages/api"),
  path.resolve(workspaceRoot, "packages/tokens"),
  path.resolve(workspaceRoot, "packages/types"),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Allow nested deps (e.g. expo-router/node_modules/@expo/metro-runtime).
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
