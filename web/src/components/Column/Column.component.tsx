import { Flex } from "../Flex";
import { FlexProps } from "../Flex/Flex.types";

export interface ColumnProps extends Omit<FlexProps, 'direction'> {

}

export const Column = ({inline = true, crossaxisalignment="start", ...props}: ColumnProps) =>
  <Flex
    direction="column"
    crossaxisalignment={crossaxisalignment}
    inline={inline}
    {...props}
  />