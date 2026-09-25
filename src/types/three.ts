/**
 * Minimal type surface for the subset of three.js used in this app.
 * three.js is loaded at runtime (see '@/utils/loadThree'), so these types describe
 * only what we call. Replace with `@types/three` once `three` is a real dependency.
 */

export type TDisposable = {
	dispose(): void;
};

export type TVector3 = {
	x: number;
	y: number;
	z: number;
	set(x: number, y: number, z: number): TVector3;
	copy(vector: TVector3): TVector3;
	add(vector: TVector3): TVector3;
	sub(vector: TVector3): TVector3;
	addScaledVector(vector: TVector3, scale: number): TVector3;
	multiplyScalar(scalar: number): TVector3;
	setScalar(scalar: number): TVector3;
	normalize(): TVector3;
	length(): number;
	distanceTo(vector: TVector3): number;
	clone(): TVector3;
};

export type TEuler = {
	x: number;
	y: number;
	z: number;
	set(x: number, y: number, z: number): TEuler;
};

export type TObject3D = {
	position: TVector3;
	rotation: TEuler;
	scale: TVector3;
	visible: boolean;
	frustumCulled: boolean;
	add(...objects: TObject3D[]): TObject3D;
	remove(...objects: TObject3D[]): TObject3D;
	lookAt(x: number, y: number, z: number): void;
};

export type TBufferAttribute = {
	array: Float32Array;
	count: number;
	needsUpdate: boolean;
	getY(index: number): number;
};

export type TBufferGeometry = TDisposable & {
	setAttribute(name: string, attribute: TBufferAttribute): TBufferGeometry;
	getAttribute(name: string): TBufferAttribute;
};

export type TMaterial = TDisposable & {
	opacity: number;
	transparent: boolean;
};

export type TColor = {
	setHex(hex: number): TColor;
};

export type TStandardMaterial = TMaterial & {
	color: TColor;
	emissive: TColor;
};

export type TBasicMaterial = TMaterial & {
	color: TColor;
};

/** Line-based helpers (GridHelper, AxesHelper) own their geometry and material. */
export type THelper = TObject3D & TDisposable;

export type TMesh = TObject3D & {
	geometry: TBufferGeometry;
	material: TMaterial;
};

export type TPoints = TObject3D & {
	geometry: TBufferGeometry;
	material: TMaterial;
};

export type TLight = TObject3D & {
	intensity: number;
};

export type TScene = TObject3D;

export type TPerspectiveCamera = TObject3D & {
	aspect: number;
	fov: number;
	updateProjectionMatrix(): void;
};

export type TWebGLRendererParameters = {
	canvas: HTMLCanvasElement;
	antialias?: boolean;
	alpha?: boolean;
	powerPreference?: 'default' | 'high-performance' | 'low-power';
};

export type TWebGLRenderer = TDisposable & {
	setPixelRatio(ratio: number): void;
	setSize(width: number, height: number, updateStyle?: boolean): void;
	setClearColor(color: number, alpha?: number): void;
	render(scene: TScene, camera: TPerspectiveCamera): void;
};

type TBaseMaterialParameters = {
	transparent?: boolean;
	opacity?: number;
	depthWrite?: boolean;
	blending?: number;
	side?: number;
	vertexColors?: boolean;
};

export type TMeshStandardMaterialParameters = TBaseMaterialParameters & {
	color?: number;
	emissive?: number;
	emissiveIntensity?: number;
	metalness?: number;
	roughness?: number;
};

export type TMeshBasicMaterialParameters = TBaseMaterialParameters & {
	color?: number;
};

export type TPointsMaterialParameters = TBaseMaterialParameters & {
	color?: number;
	size?: number;
	sizeAttenuation?: boolean;
};

export type TThreeModule = {
	Scene: new () => TScene;
	Group: new () => TObject3D;
	PerspectiveCamera: new (
		fov: number,
		aspect: number,
		near: number,
		far: number
	) => TPerspectiveCamera;
	WebGLRenderer: new (parameters: TWebGLRendererParameters) => TWebGLRenderer;
	Vector3: new (x?: number, y?: number, z?: number) => TVector3;
	AmbientLight: new (color: number, intensity?: number) => TLight;
	DirectionalLight: new (color: number, intensity?: number) => TLight;
	BufferGeometry: new () => TBufferGeometry;
	BufferAttribute: new (array: Float32Array, itemSize: number) => TBufferAttribute;
	BoxGeometry: new (width: number, height: number, depth: number) => TBufferGeometry;
	SphereGeometry: new (
		radius: number,
		widthSegments?: number,
		heightSegments?: number
	) => TBufferGeometry;
	CylinderGeometry: new (
		radiusTop: number,
		radiusBottom: number,
		height: number,
		radialSegments?: number,
		heightSegments?: number,
		openEnded?: boolean
	) => TBufferGeometry;
	MeshStandardMaterial: new (parameters: TMeshStandardMaterialParameters) => TStandardMaterial;
	MeshBasicMaterial: new (parameters: TMeshBasicMaterialParameters) => TBasicMaterial;
	PointsMaterial: new (parameters: TPointsMaterialParameters) => TMaterial;
	Mesh: new (geometry: TBufferGeometry, material: TMaterial) => TMesh;
	Points: new (geometry: TBufferGeometry, material: TMaterial) => TPoints;
	GridHelper: new (size?: number, divisions?: number, color1?: number, color2?: number) => THelper;
	AxesHelper: new (size?: number) => THelper;
	AdditiveBlending: number;
	DoubleSide: number;
};

/* ------------------------------------------------------------------------------------------
 * Shared three.js wrapper ('@/components/ThreeCanvas') contract.
 * ---------------------------------------------------------------------------------------- */

export type TThreeStatus = 'loading' | 'ready' | 'error';

/** Everything a scene needs; renderer, camera, resize and render loop are owned by the wrapper. */
export type TThreeContext = {
	THREE: TThreeModule;
	scene: TScene;
	camera: TPerspectiveCamera;
	renderer: TWebGLRenderer;
	host: HTMLDivElement;
	canvas: HTMLCanvasElement;
};

export type TThreeSceneController = {
	/** Called once per animation frame, before rendering. */
	update?: (deltaSeconds: number, now: number) => void;
	/** Called after the wrapper has resized the renderer and camera. */
	resize?: (width: number, height: number) => void;
	/** Release scene-owned resources. The renderer is disposed by the wrapper. */
	dispose?: () => void;
};

export type TThreeSceneSetup = (context: TThreeContext) => TThreeSceneController;
