import { HTMLAttributes } from "react";

type AxisDirection = 'row' | 'column';

type AxisAlignment =
  | 'start'
  | 'center'
  | 'end'
  | 'space-around'
  | 'space-between'
  | 'stretch';

type Wrap = 'wrap' | 'nowrap';

export interface FlexProps extends HTMLAttributes<HTMLDivElement> {
  direction: AxisDirection;
  wrap?: Wrap;
  spacing?: number;
  fullwidth?: boolean;
  fullHeight?: boolean;
  childrenflex?: boolean;
  inline?: boolean;
  mainaxisalignment?: AxisAlignment;
  crossaxisalignment?: AxisAlignment;
}