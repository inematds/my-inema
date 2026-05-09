import { Composition } from "remotion";
import {
  Storybook,
  durationInFrames,
  FPS,
  type StorybookProps,
} from "./Storybook";

// Default props are placeholders for the Remotion Studio preview. The actual
// render uses inputProps passed by the API route.
const defaultProps: StorybookProps = {
  title: "Sem título",
  scenes: [],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Storybook"
        component={Storybook}
        // 1 cover scene as fallback when scenes is empty so duration > 0.
        durationInFrames={Math.max(60, durationInFrames(defaultProps.scenes.length))}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
        // Calculate metadata at render time based on actual scene count.
        calculateMetadata={({ props }) => {
          const p = props as StorybookProps;
          return {
            durationInFrames: durationInFrames(p.scenes.length),
            props: p,
          };
        }}
      />
    </>
  );
};
