const { withXcodeProject } = require("@expo/config-plugins");

// Expo config plugin: link the local WrstRuntime Swift package to the watch
// target that @bacons/apple-targets generates at prebuild. Runs as a
// withXcodeProject mod, so it must be listed AFTER "@bacons/apple-targets" in the
// app config `plugins` (the scaffold does this). It's a bounded pbxproj edit
// (add a package ref + product dependency to an existing target) and prebuild
// regenerates it, so it can't corrupt a committed project. Everything is wrapped
// in try/catch with a graceful fallback to the one-time manual Xcode step.

// Path to the local Swift package, relative to the generated ios/ project dir.
const PACKAGE_REL_PATH = "../node_modules/wrst/apple-watch/wrst-runtime";
const PRODUCT_NAME = "WrstRuntime";
const PACKAGE_COMMENT = 'XCLocalSwiftPackageReference "wrst-runtime"';

const MANUAL_HINT =
  "[@wrst/react-native] Add it in Xcode: watch target -> General -> Frameworks, " +
  "Libraries -> + -> Add Other -> Add Package Dependency -> " +
  "node_modules/wrst/apple-watch/wrst-runtime -> WrstRuntime.";

module.exports = function withWrstWatch(config) {
  return withXcodeProject(config, (cfg) => {
    try {
      linkWrstRuntime(cfg.modResults);
    } catch (e) {
      console.warn(
        "[@wrst/react-native] couldn't auto-link the WrstRuntime Swift package to the watch target.\n" +
          "  " +
          MANUAL_HINT +
          "\n  Reason: " +
          (e && e.message ? e.message : String(e)),
      );
    }
    return cfg;
  });
};

function linkWrstRuntime(proj) {
  const objects = proj.hash.project.objects;
  const watch = findWatchTarget(objects);
  if (!watch) {
    // @bacons may generate the target as a separate project (or not yet); skip
    // without failing the build and point at the manual step.
    console.warn(
      "[@wrst/react-native] no watchOS target found in the main project - skipping WrstRuntime auto-link.\n" +
        "  Make sure \"@bacons/apple-targets\" is listed before \"@wrst/react-native\" in your app config plugins.\n" +
        "  " +
        MANUAL_HINT,
    );
    return;
  }
  const target = watch.target;

  // Idempotent: bail if WrstRuntime is already a product dependency of the target.
  const prodDeps = objects["XCSwiftPackageProductDependency"] || {};
  const alreadyLinked = (target.packageProductDependencies || []).some((d) => {
    const dep = prodDeps[d.value];
    return dep && dep.productName === PRODUCT_NAME;
  });
  if (alreadyLinked) return;

  const pkgRefUuid = ensurePackageRef(proj, objects);

  // XCSwiftPackageProductDependency: the "WrstRuntime product of <package>".
  const prodDepUuid = proj.generateUuid();
  objects["XCSwiftPackageProductDependency"] =
    objects["XCSwiftPackageProductDependency"] || {};
  objects["XCSwiftPackageProductDependency"][prodDepUuid] = {
    isa: "XCSwiftPackageProductDependency",
    package: pkgRefUuid,
    package_comment: PACKAGE_COMMENT,
    productName: PRODUCT_NAME,
  };
  objects["XCSwiftPackageProductDependency"][prodDepUuid + "_comment"] = PRODUCT_NAME;

  target.packageProductDependencies = target.packageProductDependencies || [];
  target.packageProductDependencies.push({ value: prodDepUuid, comment: PRODUCT_NAME });

  // PBXBuildFile linking that product into the target's Frameworks phase.
  const buildFileUuid = proj.generateUuid();
  objects["PBXBuildFile"] = objects["PBXBuildFile"] || {};
  objects["PBXBuildFile"][buildFileUuid] = {
    isa: "PBXBuildFile",
    productRef: prodDepUuid,
    productRef_comment: PRODUCT_NAME,
  };
  objects["PBXBuildFile"][buildFileUuid + "_comment"] = PRODUCT_NAME + " in Frameworks";

  const fwPhase = findFrameworksPhase(target, objects);
  if (!fwPhase) {
    throw new Error("watch target has no Frameworks build phase");
  }
  fwPhase.files = fwPhase.files || [];
  fwPhase.files.push({ value: buildFileUuid, comment: PRODUCT_NAME + " in Frameworks" });
}

// Reuse an existing local package reference to the same path, else create one
// and register it on the PBXProject.
function ensurePackageRef(proj, objects) {
  const refs =
    objects["XCLocalSwiftPackageReference"] ||
    (objects["XCLocalSwiftPackageReference"] = {});
  for (const uuid of Object.keys(refs)) {
    if (uuid.endsWith("_comment")) continue;
    const path = String(refs[uuid].relativePath || "").replace(/"/g, "");
    if (path === PACKAGE_REL_PATH) return uuid;
  }
  const pkgRefUuid = proj.generateUuid();
  refs[pkgRefUuid] = {
    isa: "XCLocalSwiftPackageReference",
    relativePath: '"' + PACKAGE_REL_PATH + '"',
  };
  refs[pkgRefUuid + "_comment"] = PACKAGE_COMMENT;

  const pbxProject = firstValue(objects["PBXProject"]);
  if (!pbxProject) throw new Error("no PBXProject in the pbxproj");
  pbxProject.packageReferences = pbxProject.packageReferences || [];
  pbxProject.packageReferences.push({ value: pkgRefUuid, comment: PACKAGE_COMMENT });
  return pkgRefUuid;
}

// The watch target is the native target whose SDKROOT is "watchos".
function findWatchTarget(objects) {
  const targets = objects["PBXNativeTarget"] || {};
  for (const uuid of Object.keys(targets)) {
    if (uuid.endsWith("_comment")) continue;
    const target = targets[uuid];
    if (targetIsWatch(target, objects)) return { uuid, target };
  }
  return null;
}

function targetIsWatch(target, objects) {
  const lists = objects["XCConfigurationList"] || {};
  const cfgs = objects["XCBuildConfiguration"] || {};
  const list = lists[target.buildConfigurationList];
  if (!list || !list.buildConfigurations) return false;
  return list.buildConfigurations.some((c) => {
    const cfg = cfgs[c.value];
    const sdk = cfg && cfg.buildSettings && cfg.buildSettings.SDKROOT;
    return sdk && String(sdk).replace(/"/g, "") === "watchos";
  });
}

function findFrameworksPhase(target, objects) {
  const phases = objects["PBXFrameworksBuildPhase"] || {};
  for (const bp of target.buildPhases || []) {
    if (phases[bp.value]) return phases[bp.value];
  }
  return null;
}

function firstValue(section) {
  if (!section) return null;
  for (const uuid of Object.keys(section)) {
    if (!uuid.endsWith("_comment")) return section[uuid];
  }
  return null;
}
