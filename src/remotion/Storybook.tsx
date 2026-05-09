import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ─── Public schema ───────────────────────────────────────────────────────────
export type StorybookScene = {
  id: string;
  name: string | null;
  epithet: string | null;
  // Either base64 (no prefix) OR a data URL.
  image_data: string | null;
};

export type StorybookProps = {
  title: string;
  scenes: StorybookScene[];
};

// 30fps · 5s per scene · cover at start.
export const FPS = 30;
export const SECONDS_PER_SCENE = 5;
export const COVER_SECONDS = 4;
export const TRANSITION_FRAMES = 18;

export function durationInFrames(scenesCount: number): number {
  return COVER_SECONDS * FPS + scenesCount * SECONDS_PER_SCENE * FPS;
}

// ─── Cover frame ─────────────────────────────────────────────────────────────
function Cover({ title }: { title: string }) {
  const frame = useCurrentFrame();
  const { durationInFrames: dur } = useVideoConfig();
  const fadeIn = spring({
    frame,
    fps: FPS,
    config: { damping: 18, stiffness: 100 },
    durationInFrames: 30,
  });
  const fadeOut = interpolate(
    frame,
    [dur - 18, dur],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, #f6efe2 0%, #ece2cf 70%, #d9cdb3 100%)",
      }}
    >
      <AbsoluteFill style={{ opacity, padding: 80 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            textAlign: "center",
            gap: 30,
          }}
        >
          <p
            style={{
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              color: "#847a6a",
              fontSize: 30,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Andaime · Junior
          </p>
          <h1
            style={{
              fontFamily: "Georgia, serif",
              color: "#1d1916",
              fontSize: 110,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: 1400,
              fontWeight: 700,
            }}
          >
            {title}
          </h1>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ─── Scene frame ─────────────────────────────────────────────────────────────
function SceneFrame({ scene, index }: { scene: StorybookScene; index: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames: dur } = useVideoConfig();

  const fadeIn = interpolate(
    frame,
    [0, TRANSITION_FRAMES],
    [0, 1],
    { extrapolateRight: "clamp" },
  );
  const fadeOut = interpolate(
    frame,
    [dur - TRANSITION_FRAMES, dur],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const opacity = Math.min(fadeIn, fadeOut);

  // Subtle ken-burns: slight zoom-in across the scene.
  const zoom = interpolate(frame, [0, dur], [1, 1.06], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const src = scene.image_data
    ? scene.image_data.startsWith("data:")
      ? scene.image_data
      : `data:image/png;base64,${scene.image_data}`
    : null;

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, #f6efe2 0%, #ece2cf 70%, #d9cdb3 100%)",
      }}
    >
      <AbsoluteFill style={{ opacity, padding: 0 }}>
        {/* Image slab */}
        <div
          style={{
            position: "absolute",
            top: 80,
            left: 80,
            right: 80,
            height: 1280,
            border: "4px solid #1d1916",
            background: "#f6efe2",
            overflow: "hidden",
          }}
        >
          {src && (
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${zoom})`,
                transformOrigin: "center",
              }}
            />
          )}
        </div>

        {/* Title card below */}
        <div
          style={{
            position: "absolute",
            bottom: 90,
            left: 0,
            right: 0,
            textAlign: "center",
            padding: "0 80px",
          }}
        >
          {scene.name && (
            <h2
              style={{
                fontFamily: "Georgia, serif",
                color: "#1d1916",
                fontSize: 64,
                lineHeight: 1.1,
                fontWeight: 700,
                margin: 0,
              }}
            >
              {scene.name}
            </h2>
          )}
          {scene.epithet && (
            <p
              style={{
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                color: "#0e544c",
                fontSize: 36,
                marginTop: 12,
              }}
            >
              {scene.epithet}
            </p>
          )}
        </div>

        {/* Page number */}
        <div
          style={{
            position: "absolute",
            top: 30,
            right: 40,
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            color: "#847a6a",
            fontSize: 22,
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ─── Composition root ───────────────────────────────────────────────────────
export const Storybook: React.FC<StorybookProps> = ({ title, scenes }) => {
  const coverFrames = COVER_SECONDS * FPS;
  const sceneFrames = SECONDS_PER_SCENE * FPS;
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={coverFrames}>
        <Cover title={title || "Sem título"} />
      </Sequence>
      {scenes.map((s, i) => (
        <Sequence
          key={s.id}
          from={coverFrames + i * sceneFrames}
          durationInFrames={sceneFrames}
        >
          <SceneFrame scene={s} index={i} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
