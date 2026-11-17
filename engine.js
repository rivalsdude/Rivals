/* Babylon.js engine adapter
 * ------------------------------------------------------------------------
 * The game was written against a small subset of the Three.js API. This
 * module implements that subset on top of Babylon.js, so the game runs on a
 * real Babylon scene (engine, meshes, lights, PBR/standard materials,
 * shadow generators, picking) without a build step.
 *
 * New 3D features can import { BABYLON, bscene, bengine } from here and use
 * native Babylon APIs alongside the game code.
 *
 * Coordinate system: Babylon runs in right-handed mode, which matches the
 * game's original +Y up / -Z forward conventions exactly.
 */
const B = window.BABYLON;
if (!B) throw new Error('Babylon.js failed to load');

export { B as BABYLON };
export const VERSION = B.Engine.Version;

/* ------------------------------------------------------------------ */
/* Shared engine / scene                                              */
/* ------------------------------------------------------------------ */
let bengine = null;
let bscene = null;
let canvas = null;
let nameSeq = 0;
const nextName = (prefix) => prefix + '_' + (++nameSeq);

function createEngine() {
  if (bengine) return bengine;
  canvas = document.createElement('canvas');
  canvas.id = 'game-canvas';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.tabIndex = 0;
  const host = document.getElementById('game') || document.body;
  host.appendChild(canvas);

  bengine = new B.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    antialias: true,
    powerPreference: 'high-performance',
  }, true);

  bscene = new B.Scene(bengine);
  // Right-handed keeps the original world axes and camera rotations intact.
  bscene.useRightHandedSystem = true;
  bscene.autoClear = true;
  bscene.autoClearDepthAndStencil = true;
  bscene.skipPointerMovePicking = true;
  bscene.clearColor = new B.Color4(0.17, 0.31, 0.55, 1);
  bscene.fogMode = B.Scene.FOGMODE_NONE;

  addEventListener('resize', () => bengine.resize());
  return bengine;
}

addEventListener('resize', () => { if (bengine) bengine.resize(); });

/* ------------------------------------------------------------------ */
/* Colour + vector helpers                                            */
/* ------------------------------------------------------------------ */
const hexToColor3 = (hex) => B.Color3.FromHexString(
  '#' + ((Number(hex) >>> 0) & 0xffffff).toString(16).padStart(6, '0')
);
const toColor3 = (color) => (color && typeof color === 'object' && 'r' in color) ? color : hexToColor3(color);

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

// Three multiplies emissive colours in linear space and converts the result
// back for display, so a bright emissive clamps to a saturated colour instead
// of washing out to white. Babylon's StandardMaterial works directly in
// display space, so do the same conversion up front.
function emissiveColor3(hex, intensity) {
  const color = hexToColor3(hex);
  const scale = Math.max(0, intensity);
  const toDisplay = (channel) => linearToSrgb(Math.min(1, srgbToLinear(channel) * scale));
  return new B.Color3(toDisplay(color.r), toDisplay(color.g), toDisplay(color.b));
}

// Three code calls .setHex() on material emissive colours for hit flashes.
if (!B.Color3.prototype.setHex) {
  B.Color3.prototype.setHex = function setHex(hex) {
    const color = hexToColor3(hex);
    this.r = color.r; this.g = color.g; this.b = color.b;
    return this;
  };
}

const AXES = {
  X: new B.Vector3(1, 0, 0),
  Y: new B.Vector3(0, 1, 0),
  Z: new B.Vector3(0, 0, 1),
};

export class Vector3 extends B.Vector3 {
  set(x, y, z) { this.x = x; this.y = y; this.z = z; this._dirty(); return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; this._dirty(); return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; this._dirty(); return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; this._dirty(); return this; }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; this._dirty(); return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; this._dirty(); return this; }
  normalize() {
    const length = Math.hypot(this.x, this.y, this.z) || 1;
    this.x /= length; this.y /= length; this.z /= length;
    this._dirty();
    return this;
  }
  lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  lerp(v, alpha) {
    this.x += (v.x - this.x) * alpha;
    this.y += (v.y - this.y) * alpha;
    this.z += (v.z - this.z) * alpha;
    this._dirty();
    return this;
  }
  setScalar(s) { this.x = s; this.y = s; this.z = s; this._dirty(); return this; }
  // Right-handed Rodrigues rotation (matches Three's Vector3.applyAxisAngle).
  applyAxisAngle(axis, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const x = this.x, y = this.y, z = this.z;
    const ax = axis.x, ay = axis.y, az = axis.z;
    const dot = ax * x + ay * y + az * z;
    this.x = x * c + (ay * z - az * y) * s + ax * dot * (1 - c);
    this.y = y * c + (az * x - ax * z) * s + ay * dot * (1 - c);
    this.z = z * c + (ax * y - ay * x) * s + az * dot * (1 - c);
    this._dirty();
    return this;
  }
  // Three's Euler order is used by camera.rotation (YXZ) and a few effects.
  applyEuler(euler) {
    const order = (euler && euler.order) || 'XYZ';
    for (let i = order.length - 1; i >= 0; i--) {
      const axis = order[i];
      const angle = axis === 'X' ? euler.x : axis === 'Y' ? euler.y : euler.z;
      if (angle) this.applyAxisAngle(AXES[axis], angle);
    }
    return this;
  }
  _dirty() { this._isDirty = true; if (this._onChange) this._onChange(this); }
}

export class Vector2 extends B.Vector2 {
  set(x, y) { this.x = x; this.y = y; this._isDirty = true; if (this._onChange) this._onChange(this); return this; }
  clone() { return new Vector2(this.x, this.y); }
}

class Euler {
  constructor(node) {
    this._node = node;
    this._x = 0; this._y = 0; this._z = 0;
    this._order = 'XYZ';
  }
  get x() { return this._x; }
  set x(v) { this._x = v; this._apply(); }
  get y() { return this._y; }
  set y(v) { this._y = v; this._apply(); }
  get z() { return this._z; }
  set z(v) { this._z = v; this._apply(); }
  get order() { return this._order; }
  set order(v) { this._order = v; }
  set(x, y, z) { this._x = x; this._y = y; this._z = z; this._apply(); return this; }
  clone() { const e = new Euler(this._node); e._x = this._x; e._y = this._y; e._z = this._z; e._order = this._order; return e; }
  copy(euler) {
    this._x = euler.x; this._y = euler.y; this._z = euler.z;
    if (euler.order) this._order = euler.order;
    this._apply();
    return this;
  }
  _apply() {
    if (!this._node) return;
    this._node.rotation.x = this._x;
    this._node.rotation.y = this._y;
    this._node.rotation.z = this._z;
  }
  _read() {
    if (!this._node) return this;
    this._x = this._node.rotation.x;
    this._y = this._node.rotation.y;
    this._z = this._node.rotation.z;
    return this;
  }
}

class Color {
  constructor(hex = 0xffffff, onChange = null) {
    this.onChange = onChange;
    this.r = 1; this.g = 1; this.b = 1;
    this.setHex(hex);
  }
  setHex(hex) {
    const c = hexToColor3(hex);
    this.r = c.r; this.g = c.g; this.b = c.b;
    if (this.onChange) this.onChange(this);
    return this;
  }
  copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; if (this.onChange) this.onChange(this); return this; }
}

/* ------------------------------------------------------------------ */
/* Scene                                                              */
/* ------------------------------------------------------------------ */
class Fog {
  constructor(hex, near, far, scene) {
    this._scene = scene || null;
    this._near = near;
    this._far = far;
    this.color = new Color(hex, () => this._scene && this._scene._applyFog());
    if (this._scene) this._scene._applyFog();
  }
  get near() { return this._near; }
  set near(value) { this._near = value; this._scene._applyFog(); }
  get far() { return this._far; }
  set far(value) { this._far = value; this._scene._applyFog(); }
}

export class Scene {
  constructor() {
    createEngine();
    this.babylon = bscene;
    this.children = [];
    this._background = new Color(0x2b4f8c, () => this._applyBackground());
    this._fog = null;
    this._applyBackground();
  }
  _applyBackground() {
    const color = this._background;
    if (!color) return;
    this.babylon.clearColor = new B.Color4(color.r, color.g, color.b, 1);
  }
  _applyFog() {
    if (!this._fog) { this.babylon.fogMode = B.Scene.FOGMODE_NONE; return; }
    this.babylon.fogMode = B.Scene.FOGMODE_LINEAR;
    this.babylon.fogColor = new B.Color3(this._fog.color.r, this._fog.color.g, this._fog.color.b);
    this.babylon.fogStart = this._fog.near;
    this.babylon.fogEnd = this._fog.far;
  }
  get background() { return this._background; }
  set background(color) {
    if (color instanceof Color) {
      this._background = color;
      color.onChange = () => this._applyBackground();
    } else {
      this._background = new Color(color, () => this._applyBackground());
    }
    this._applyBackground();
  }
  get fog() { return this._fog; }
  set fog(fog) {
    this._fog = fog instanceof Fog ? fog : new Fog(fog.color, fog.near, fog.far, this);
    this._fog._scene = this;
    this._applyFog();
  }
  add(...objects) {
    for (const object of objects.flat()) {
      if (!object || this.children.includes(object)) continue;
      this.children.push(object);
    }
  }
  remove(object) {
    const index = this.children.indexOf(object);
    if (index >= 0) this.children.splice(index, 1);
    if (object && object.parent) object.parent.remove(object);
    else if (object && object.__dispose) object.__dispose();
  }
}

/* ------------------------------------------------------------------ */
/* Renderer + camera                                                  */
/* ------------------------------------------------------------------ */
export class WebGLRenderer {
  constructor() {
    createEngine();
    this.engine = bengine;
    this.domElement = canvas;
    this.shadowMap = { enabled: true, type: 1 };
  }
  setPixelRatio(ratio) {
    this.engine.setHardwareScalingLevel(1 / Math.max(0.5, Math.min(3, ratio || 1)));
  }
  setSize() { this.engine.resize(); }
  render(scene) { scene.babylon.render(); }
}

function cameraForward(cameraNode) {
  cameraNode.computeWorldMatrix(true);
  const direction = B.Vector3.TransformNormal(new B.Vector3(0, 0, -1), cameraNode.getWorldMatrix());
  return new Vector3(direction.x, direction.y, direction.z).normalize();
}

export class PerspectiveCamera {
  constructor(fov = 72, aspect = 1, near = 0.1, far = 200) {
    createEngine();
    this.babylon = new B.FreeCamera(nextName('camera'), new B.Vector3(0, 0, 0), bscene);
    this.babylon.fov = (fov * Math.PI) / 180;
    this.babylon.minZ = near;
    this.babylon.maxZ = far;
    this.babylon.rotation.set(0, 0, 0);
    this.babylon.inputs.clear();
    bscene.activeCamera = this.babylon;

    this.position = this.babylon.position = new Vector3(0, 0, 0);
    this.rotation = new Euler(this.babylon);
    this.rotation.order = 'YXZ';
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.children = [];
    this.parent = null;
    this.visible = true;
    this.userData = {};
  }
  add(...objects) { for (const object of objects.flat()) attach(this, object); }
  remove(object) { detach(this, object); }
  updateProjectionMatrix() { this.babylon.fov = (this.fov * Math.PI) / 180; }
  lookAt(x, y, z) {
    this.babylon.setTarget(new B.Vector3(x, y, z));
    this.rotation._read();
  }
}

/* ------------------------------------------------------------------ */
/* Transforms                                                         */
/* ------------------------------------------------------------------ */
function attach(parent, child) {
  if (!parent || !child) return;
  if (child.parent && child.parent !== parent) child.parent.remove(child);
  child.parent = parent;
  if (!parent.children.includes(child)) parent.children.push(child);
  if (child.__isLight) {
    child._groupVisible = parent._visible !== false;
    child.visible = parent._visible !== false && child._ownVisible !== false;
    return;
  }
  if (child.babylon && parent.babylon) child.babylon.parent = parent.babylon;
}

function detach(parent, child) {
  if (!parent || !child) return;
  const index = parent.children.indexOf(child);
  if (index >= 0) parent.children.splice(index, 1);
  child.parent = null;
  if (child.__isLight) return;
  if (child.babylon) child.babylon.parent = null;
}

class TransformBase {
  constructor() {
    this.children = [];
    this.parent = null;
    this.userData = {};
    this._visible = true;
    this._ownVisible = true;
  }
  add(...objects) { for (const object of objects.flat()) attach(this, object); }
  remove(object) {
    detach(this, object);
    if (object && object.__dispose) object.__dispose();
  }
  get visible() { return this._visible; }
  set visible(value) {
    const visible = !!value;
    this._visible = visible;
    this._ownVisible = visible;
    if (this.__isLight) {
      this.visible = this._groupVisible !== false && visible;
      return;
    }
    if (this.babylon) this.babylon.setEnabled(visible);
    for (const child of this.children) {
      if (child.__isLight) child._groupVisible = visible;
      else if (child.__setGroupVisible) child.__setGroupVisible(visible);
    }
  }
  __setGroupVisible(value) {
    this._groupVisible = value;
    if (this.babylon) this.babylon.setEnabled(value && this._ownVisible);
    for (const child of this.children) {
      if (child.__isLight) child._groupVisible = value;
      else if (child.__setGroupVisible) child.__setGroupVisible(value);
    }
  }
  localToWorld(vector) {
    this.babylon.computeWorldMatrix(true);
    const result = B.Vector3.TransformCoordinates(vector, this.babylon.getWorldMatrix());
    return new Vector3(result.x, result.y, result.z);
  }
  updateWorldMatrix() { this.babylon.computeWorldMatrix(true); }
  worldPosition() {
    const position = this.babylon.getAbsolutePosition();
    return new Vector3(position.x, position.y, position.z);
  }
}

export class Group extends TransformBase {
  constructor() {
    super();
    createEngine();
    this.babylon = new B.TransformNode(nextName('group'), bscene);
    this.position = this.babylon.position = new Vector3(0, 0, 0);
    this.scale = this.scaling = this.babylon.scaling = new Vector3(1, 1, 1);
    this.rotation = new Euler(this.babylon);
    this.babylon.__wrap = this;
  }
  __dispose() {
    for (const child of [...this.children]) child.__dispose && child.__dispose();
    this.children.length = 0;
    if (this.babylon) this.babylon.dispose();
  }
}

/* ------------------------------------------------------------------ */
/* Geometry                                                           */
/* ------------------------------------------------------------------ */
export class BoxGeometry { constructor(width, height, depth) { this.kind = 'box'; this.width = width; this.height = height; this.depth = depth; } }
export class CylinderGeometry { constructor(radiusTop, radiusBottom, height, segments = 12, heightSegments = 1, openEnded = false) { this.kind = 'cylinder'; this.radiusTop = radiusTop; this.radiusBottom = radiusBottom; this.height = height; this.segments = segments; this.openEnded = openEnded; } }
export class SphereGeometry { constructor(radius, widthSegments = 12, heightSegments = 8) { this.kind = 'sphere'; this.radius = radius; this.segments = Math.max(3, Math.min(widthSegments, heightSegments)); } }
export class ConeGeometry { constructor(radius, height, radialSegments = 12) { this.kind = 'cone'; this.radius = radius; this.height = height; this.segments = radialSegments; } }
export class TorusGeometry { constructor(radius, tube, radialSegments = 8, tubularSegments = 32) { this.kind = 'torus'; this.radius = radius; this.tube = tube; this.segments = tubularSegments; } }

function createMesh(geometry) {
  const name = nextName(geometry.kind);
  switch (geometry.kind) {
    case 'box':
      return B.MeshBuilder.CreateBox(name, { width: geometry.width, height: geometry.height, depth: geometry.depth }, bscene);
    case 'cylinder':
      return B.MeshBuilder.CreateCylinder(name, {
        height: geometry.height,
        diameterTop: Math.max(0.001, geometry.radiusTop * 2),
        diameterBottom: Math.max(0.001, geometry.radiusBottom * 2),
        tessellation: Math.max(3, geometry.segments),
        cap: geometry.openEnded ? B.Mesh.CAP_NONE : B.Mesh.CAP_ALL,
      }, bscene);
    case 'sphere':
      return B.MeshBuilder.CreateSphere(name, {
        diameter: geometry.radius * 2,
        segments: geometry.segments,
      }, bscene);
    case 'cone':
      return B.MeshBuilder.CreateCylinder(name, {
        height: geometry.height,
        diameterTop: 0,
        diameterBottom: Math.max(0.001, geometry.radius * 2),
        tessellation: Math.max(3, geometry.segments),
      }, bscene);
    case 'torus':
      return B.MeshBuilder.CreateTorus(name, {
        diameter: geometry.radius * 2,
        thickness: geometry.tube * 2,
        tessellation: Math.max(3, geometry.segments),
      }, bscene);
    default:
      return B.MeshBuilder.CreateBox(name, { width: 1, height: 1, depth: 1 }, bscene);
  }
}

/* ------------------------------------------------------------------ */
/* Materials + textures                                               */
/* ------------------------------------------------------------------ */
class BaseMaterial {
  constructor() { this.transparent = false; this.babylon = null; }
  dispose() { if (this.babylon) this.babylon.dispose(); }
}

export class MeshStandardMaterial extends BaseMaterial {
  constructor({ color = 0xffffff, emissive = 0, emissiveIntensity = 1, roughness = 0.6, metalness = 0.15 } = {}) {
    super();
    const material = new B.StandardMaterial(nextName('standard'), bscene);
    material.diffuseColor = hexToColor3(color);
    material.specularColor = new B.Color3(0.06, 0.06, 0.06);
    material.specularPower = 4 + (1 - roughness) * 60;
    material.emissiveColor = emissive ? emissiveColor3(emissive, emissiveIntensity) : new B.Color3(0, 0, 0);
    if (metalness > 0.4) {
      material.specularColor = new B.Color3(0.25, 0.25, 0.25);
      material.specularPower = 96;
    }
    this.babylon = material;
  }
  get color() { return this.babylon.diffuseColor; }
  get emissive() { return this.babylon.emissiveColor; }
  set emissive(value) { this.babylon.emissiveColor = toColor3(value); }
}

class BasicMaterial extends BaseMaterial {
  constructor({ color = 0xffffff, transparent = false, opacity = 1, blending = 0, depthWrite = true } = {}) {
    super();
    const material = new B.StandardMaterial(nextName('basic'), bscene);
    material.disableLighting = true;
    material.diffuseColor = new B.Color3(0, 0, 0);
    material.specularColor = new B.Color3(0, 0, 0);
    material.emissiveColor = hexToColor3(color);
    material.alpha = opacity;
    material.backFaceCulling = false;
    if (blending === AdditiveBlending) material.alphaMode = B.Constants.ALPHA_ADD;
    if (!depthWrite) material.disableDepthWrite = true;
    this.transparent = transparent;
    this.babylon = material;
  }
  get color() { return this.babylon.emissiveColor; }
  get emissive() { return this.babylon.emissiveColor; }
  get opacity() { return this.babylon.alpha; }
  set opacity(value) { this.babylon.alpha = value; }
}

export class MeshBasicMaterial extends BasicMaterial {}
export const AdditiveBlending = 2;

export class CanvasTexture {
  constructor(sourceCanvas) {
    this.source = sourceCanvas;
    this.dynamic = new B.DynamicTexture(nextName('canvas'), {
      width: sourceCanvas.width,
      height: sourceCanvas.height,
    }, bscene, false);
    this.dynamic.hasAlpha = true;
    this._blit();
  }
  _blit() {
    const context = this.dynamic.getContext();
    context.clearRect(0, 0, this.source.width, this.source.height);
    context.drawImage(this.source, 0, 0);
    this.dynamic.update(false);
  }
  get needsUpdate() { return false; }
  set needsUpdate(value) { if (value) this._blit(); }
  dispose() { this.dynamic.dispose(); }
}

class SpriteMaterialImpl extends BaseMaterial {
  constructor({ map, transparent = true, depthWrite = true } = {}) {
    super();
    const material = new B.StandardMaterial(nextName('sprite'), bscene);
    material.disableLighting = true;
    material.emissiveColor = new B.Color3(1, 1, 1);
    material.specularColor = new B.Color3(0, 0, 0);
    material.diffuseColor = new B.Color3(1, 1, 1);
    material.backFaceCulling = false;
    if (map) {
      material.diffuseTexture = map.dynamic;
      material.diffuseTexture.hasAlpha = true;
      material.useAlphaFromDiffuseTexture = true;
      material.emissiveTexture = map.dynamic;
      material.opacityTexture = map.dynamic;
    }
    if (!depthWrite) material.disableDepthWrite = true;
    this.map = map;
    this.transparent = transparent;
    this.babylon = material;
  }
}
export { SpriteMaterialImpl as SpriteMaterial };

/* ------------------------------------------------------------------ */
/* Meshes + sprites                                                   */
/* ------------------------------------------------------------------ */
const shadowCasters = new Set();
const shadowGenerators = new Set();

function syncShadowCaster(mesh) {
  for (const generator of shadowGenerators) {
    if (mesh._castShadow) {
      if (!mesh._shadowAdded) generator.addShadowCaster(mesh.babylon);
    } else if (mesh._shadowAdded) {
      generator.removeShadowCaster(mesh.babylon);
    }
  }
  mesh._shadowAdded = !!mesh._castShadow;
}

export class Mesh extends TransformBase {
  constructor(geometry, material) {
    super();
    createEngine();
    this.babylon = createMesh(geometry);
    this.babylon.__wrap = this;
    this.position = this.babylon.position = new Vector3(0, 0, 0);
    this.scale = this.scaling = this.babylon.scaling = new Vector3(1, 1, 1);
    this.rotation = new Euler(this.babylon);
    this.material = material || null;
    if (material && material.babylon) this.babylon.material = material.babylon;
    this._geometry = { dispose() {} };
    this._castShadow = false;
    this.babylon.isPickable = true;

    const self = this;
    Object.defineProperty(this, 'castShadow', {
      get() { return self._castShadow; },
      set(value) {
        self._castShadow = !!value;
        syncShadowCaster(self);
      },
    });
    Object.defineProperty(this, 'receiveShadow', {
      get() { return !!self.babylon.receiveShadows; },
      set(value) { self.babylon.receiveShadows = !!value; },
    });
  }
  get geometry() { return this._geometry; }
  get quaternion() {
    const node = this.babylon;
    if (!node.rotationQuaternion) {
      node.rotationQuaternion = new B.Quaternion();
      node.rotationQuaternion.setFromUnitVectors = (from, to) => {
        B.Quaternion.FromUnitVectorsToRef(from, to, node.rotationQuaternion);
        return node.rotationQuaternion;
      };
    }
    return node.rotationQuaternion;
  }
  __dispose() {
    shadowCasters.delete(this);
    for (const generator of shadowGenerators) generator.removeShadowCaster(this.babylon);
    this.children.length = 0;
    if (this.babylon) this.babylon.dispose();
  }
}

export class Sprite extends TransformBase {
  constructor(material) {
    super();
    createEngine();
    this.babylon = B.MeshBuilder.CreatePlane(nextName('sprite'), { width: 1, height: 1, sideOrientation: B.Mesh.DOUBLESIDE }, bscene);
    this.babylon.__wrap = this;
    this.babylon.billboardMode = B.Mesh.BILLBOARDMODE_ALL;
    this.babylon.isPickable = false;
    // A billboarded plane faces the camera with its axes reversed in
    // right-handed mode, which would draw text upside down and backwards.
    // Flipping both geometry UV axes keeps labels readable. (Texture uScale
    // and uOffset are no-ops on DynamicTexture, so that route does not work.)
    const uvs = this.babylon.getVerticesData(B.VertexBuffer.UVKind);
    if (uvs) {
      for (let i = 0; i < uvs.length; i++) uvs[i] = 1 - uvs[i];
      this.babylon.setVerticesData(B.VertexBuffer.UVKind, uvs);
    }
    this.position = this.babylon.position = new Vector3(0, 0, 0);
    this.scale = this.scaling = this.babylon.scaling = new Vector3(1, 1, 1);
    this.rotation = new Euler(this.babylon);
    this.material = material || null;
    if (material && material.babylon) this.babylon.material = material.babylon;
  }
  __dispose() {
    if (this.babylon) this.babylon.dispose();
  }
}

/* ------------------------------------------------------------------ */
/* Lights                                                             */
/* ------------------------------------------------------------------ */
class BaseLight extends TransformBase {
  constructor() {
    super();
    this.__isLight = true;
    this._groupVisible = true;
    this._ownVisible = true;
  }
  get visible() { return this._ownVisible; }
  set visible(value) {
    this._ownVisible = !!value;
    this.babylon.setEnabled(this._groupVisible !== false && this._ownVisible);
  }
  get intensity() { return this.babylon.intensity; }
  set intensity(value) { this.babylon.intensity = value; }
  __dispose() { if (this.babylon) this.babylon.dispose(); }
}

export class HemisphereLight extends BaseLight {
  constructor(sky, ground, intensity = 1) {
    super();
    createEngine();
    this.babylon = new B.HemisphericLight(nextName('hemi'), new B.Vector3(0, 1, 0), bscene);
    this.babylon.diffuse = hexToColor3(sky);
    this.babylon.groundColor = hexToColor3(ground);
    this.babylon.specular = new B.Color3(0, 0, 0);
    this.babylon.intensity = intensity * 0.32;
  }
}

export class AmbientLight extends BaseLight {
  constructor(color, intensity = 1) {
    super();
    createEngine();
    this.babylon = new B.HemisphericLight(nextName('ambient'), new B.Vector3(0, 1, 0), bscene);
    this.babylon.diffuse = hexToColor3(color);
    this.babylon.groundColor = hexToColor3(color);
    this.babylon.specular = new B.Color3(0, 0, 0);
    this.babylon.intensity = intensity * 0.28;
  }
}

export class DirectionalLight extends BaseLight {
  constructor(color, intensity = 1) {
    super();
    createEngine();
    this.babylon = new B.DirectionalLight(nextName('sun'), new B.Vector3(0, -1, 0), bscene);
    this.babylon.diffuse = hexToColor3(color);
    this.babylon.specular = new B.Color3(0.05, 0.05, 0.05);
    this.babylon.intensity = intensity * 0.26;
    this._position = new Vector3(0, 1, 0);
    this._position._onChange = () => this._updateDirection();
    this.position = this._position;
    this._castShadow = false;
    this._generator = null;
    this._mapSize = 1024;
    const self = this;
    this.shadow = {
      mapSize: {
        set(width, height) {
          self._mapSize = Math.max(256, Math.min(2048, Math.round(Math.max(width, height))));
          if (self._generator) {
            self._generator.mapSize = new B.Vector2(self._mapSize, self._mapSize);
          }
        },
      },
    };
    this._updateDirection();
  }
  _updateDirection() {
    const p = this._position;
    const direction = new B.Vector3(-p.x, -p.y, -p.z);
    if (direction.lengthSquared() > 0.000001) this.babylon.direction = direction.normalize();
  }
  get position() { return this._position; }
  set position(value) {
    this._position = value instanceof Vector3 ? value : new Vector3(value.x, value.y, value.z);
    this._position._onChange = () => this._updateDirection();
    this._updateDirection();
  }
  get castShadow() { return this._castShadow; }
  set castShadow(value) {
    const cast = !!value;
    if (cast === this._castShadow) return;
    this._castShadow = cast;
    if (cast) {
      this._generator = new B.ShadowGenerator(this._mapSize, this.babylon);
      this._generator.usePercentageCloserFiltering = true;
      this._generator.filteringQuality = B.ShadowGenerator.QUALITY_MEDIUM;
      this._generator.bias = 0.0015;
      shadowGenerators.add(this._generator);
      for (const mesh of shadowCasters) this._generator.addShadowCaster(mesh.babylon);
    } else if (this._generator) {
      shadowGenerators.delete(this._generator);
      this._generator.dispose();
      this._generator = null;
    }
  }
}

export class PointLight extends BaseLight {
  constructor(color, intensity = 1, distance = 0) {
    super();
    createEngine();
    this.babylon = new B.PointLight(nextName('point'), new B.Vector3(0, 0, 0), bscene);
    this.babylon.diffuse = toColor3(color);
    this.babylon.specular = new B.Color3(0, 0, 0);
    this.babylon.intensity = intensity * 0.35;
    if (distance) this.babylon.range = distance;
    this.position = this.babylon.position = new Vector3(0, 0, 0);
  }
}

/* ------------------------------------------------------------------ */
/* Raycasting                                                         */
/* ------------------------------------------------------------------ */
function collectMeshes(objects, recursive, target) {
  for (const object of objects) {
    if (!object) continue;
    if (object instanceof Mesh && object.babylon && object.babylon.isPickable) target.add(object.babylon);
    if (recursive && object.children) collectMeshes(object.children, true, target);
  }
  return target;
}

function isWrapperVisible(wrapper) {
  let node = wrapper;
  while (node) {
    if (node._visible === false) return false;
    node = node.parent;
  }
  return true;
}

export class Raycaster {
  constructor(origin, direction, near = 0, far = Infinity) {
    this.ray = {
      origin: origin ? origin.clone() : new Vector3(0, 0, 0),
      direction: direction ? direction.clone() : new Vector3(0, 0, -1),
      near,
      far,
    };
    this.camera = null;
  }
  setFromCamera(coords, camera) {
    createEngine();
    const width = canvas.clientWidth || canvas.width;
    const height = canvas.clientHeight || canvas.height;
    const x = ((coords.x + 1) * 0.5) * width;
    const y = ((1 - coords.y) * 0.5) * height;
    const ray = bscene.createPickingRay(x, y, B.Matrix.Identity(), camera.babylon);
    this.ray.origin = new Vector3(ray.origin.x, ray.origin.y, ray.origin.z);
    this.ray.direction = new Vector3(ray.direction.x, ray.direction.y, ray.direction.z).normalize();
    this.ray.near = 0;
    this.ray.far = 300;
    this.camera = camera;
  }
  intersectObjects(objects, recursive = false) {
    createEngine();
    const allowed = collectMeshes(objects, recursive, new Set());
    if (!allowed.size) return [];
    const length = this.ray.far === Infinity ? 500 : Math.max(0.001, this.ray.far);
    const ray = new B.Ray(
      new B.Vector3(this.ray.origin.x, this.ray.origin.y, this.ray.origin.z),
      new B.Vector3(this.ray.direction.x, this.ray.direction.y, this.ray.direction.z),
      length
    );
    const infos = bscene.multiPickWithRay(ray, (mesh) => {
      if (!allowed.has(mesh) || !mesh.isPickable || !mesh.isEnabled()) return false;
      const wrapper = mesh.__wrap;
      return !!wrapper && isWrapperVisible(wrapper);
    });
    if (!infos || !infos.length) return [];
    const near = this.ray.near || 0;
    const far = length;
    return infos
      .filter((info) => info && info.pickedMesh && info.distance >= near && info.distance <= far)
      .map((info) => {
        const point = info.pickedPoint || B.Vector3.Zero();
        return {
          object: info.pickedMesh.__wrap,
          distance: info.distance,
          point: new Vector3(point.x, point.y, point.z),
        };
      })
      .filter((hit) => !!hit.object)
      .sort((a, b) => a.distance - b.distance);
  }
}

/* ------------------------------------------------------------------ */
/* Clock + shading constants                                          */
/* ------------------------------------------------------------------ */
export class Clock {
  constructor() { this.last = performance.now(); }
  getDelta() {
    const now = performance.now();
    let delta = (now - this.last) / 1000;
    this.last = now;
    if (delta > 0.1) delta = 0.1;
    return delta;
  }
}

export const PCFSoftShadowMap = 1;
export { Color, Fog };
export { bscene, bengine, canvas as rendererCanvas };
