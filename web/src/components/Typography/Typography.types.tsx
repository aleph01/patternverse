import { HTMLAttributes } from "react";

export interface BaseProps extends HTMLAttributes<HTMLElement> {
  /**
   * font spacing
   * @type number
   */
  spacing?: number;

  /**
   * font color
   * @type string
   */
  color?: string;
}

export interface TextProps extends BaseProps {
  /**
   * font size of the text
   * @type number
   */
  size?: number;

  /**
   * weight of the font
   * @type number | string
   */
  fontWeight?: number | string;

  /***
   * the font family
   */
  fontFamily?: string;
}
